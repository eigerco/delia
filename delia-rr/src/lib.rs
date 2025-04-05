use libp2p::{
    core,
    futures::{channel::oneshot, select, StreamExt},
    identity::{self, Keypair},
    noise,
    request_response::{self, ProtocolSupport},
    swarm::{self, ConnectionId, NetworkBehaviour, SwarmEvent},
    websocket_websys as websocket, yamux, Multiaddr, PeerId, StreamProtocol, Transport,
};
use serde::{Deserialize, Serialize};
use std::{result, str::FromStr};
use tracing::level_filters::LevelFilter;
use tracing_subscriber::{
    fmt::{format, time::UtcTime},
    layer::SubscriberExt,
    util::SubscriberInitExt,
    Layer,
};
use wasm_bindgen::prelude::*;

/// Setup browser logging.
#[wasm_bindgen]
pub fn setup_logging() {
    console_error_panic_hook::set_once();

    let fmt_layer = tracing_subscriber::fmt::layer()
        .with_ansi(false)
        .with_timer(UtcTime::rfc_3339()) // std::time is not available in browsers
        .with_writer(tracing_web::MakeConsoleWriter) // write events to the console
        .with_filter(LevelFilter::DEBUG);

    let _ = tracing_subscriber::registry().with(fmt_layer).try_init();
}

/// Resolve a provided PeerId by connecting to the provided bootnodes.
#[wasm_bindgen]
pub async fn resolve_peer_id(bootnodes: Vec<String>, query: String) -> Result<String, String> {
    let bootnodes = bootnodes
        .into_iter()
        .map(|s| Multiaddr::from_str(&s))
        .collect::<Result<Vec<Multiaddr>, _>>()
        .map_err(|err| err.to_string())?;

    let query = PeerId::from_str(&query).map_err(|err| err.to_string())?;

    tracing::info!("Query: {}", query);

    perform_query_inner(bootnodes, query)
        .await
        .map(|maddrs| maddrs.iter().map(ToString::to_string).collect())
}

async fn perform_query_inner(
    bootnodes: Vec<Multiaddr>,
    query: PeerId,
) -> Result<Vec<Multiaddr>, String> {
    // This node is ephemeral so we don't care for the actual identity
    // we can read it from the user selected account but to query the DHT it doesn't make a difference
    let identity = identity::Keypair::generate_ed25519();

    let swarm = inner_create_swarm(&identity, bootnodes);
    let mut state = State { swarm };

    state.event_loop(query).await
}

#[derive(Debug, thiserror::Error)]
enum SwarmError {
    #[error(transparent)]
    Noise(#[from] noise::Error),

    #[error(transparent)]
    Dial(#[from] libp2p::swarm::DialError),

    #[error(transparent)]
    Canceled(#[from] oneshot::Canceled),
}

/// Wrapper over the [`libp2p::Swarm`] and it's state.
struct Swarm {
    /// The actual swarm, driving the libp2p execution.
    inner: libp2p::Swarm<Behaviour>,
    /// The query being performed.
    query: PeerId,

    result_tx: oneshot::Sender<Result<Response, SwarmError>>,
    result_rx: oneshot::Receiver<Result<Response, SwarmError>>,
}

impl Swarm {
    fn new(identity: &Keypair, query: PeerId) -> Result<Self, SwarmError> {
        let local_peer_id = identity.public().to_peer_id();
        tracing::info!("Local peer id: {local_peer_id}");

        let noise_config = noise::Config::new(&identity)?;
        let muxer_config = yamux::Config::default();

        let (result_tx, result_rx) = oneshot::channel();

        Ok(Self {
            inner: libp2p::Swarm::new(
                websocket::Transport::default()
                    .upgrade(core::upgrade::Version::V1Lazy)
                    .authenticate(noise_config)
                    .multiplex(muxer_config)
                    .boxed(),
                Behaviour::new(),
                local_peer_id,
                swarm::Config::with_wasm_executor(),
            ),
            query,
            result_rx,
            result_tx,
        })
    }

    async fn start(mut self, bootnodes: Vec<Multiaddr>) -> Result<Response, SwarmError> {
        for addr in bootnodes {
            self.inner.dial(addr)?;
        }

        loop {
            select! {
                event = self.inner.select_next_some() => self.on_swarm_event(event),
                result = &mut self.result_rx => {
                    return result?
                        .inspect(|response| tracing::info!("Swarm finished with response: {response:?}"))
                        .inspect_err(|err| tracing::error!("Swarm finished with error: {err:?}"));
                }
            }
        }
    }

    fn on_swarm_event(&mut self, event: SwarmEvent<BehaviourEvent>) {
        match event {
            SwarmEvent::ConnectionEstablished { peer_id, .. } => {
                self.inner
                    .behaviour_mut()
                    .rr
                    .send_request(&peer_id, Request { peer: self.query });
            }
            SwarmEvent::Behaviour(event) => self.on_behaviour_event(event),
            _ => tracing::trace!("Unhandled swarm event: {event:?}"),
        }
    }

    fn on_behaviour_event(&mut self, event: BehaviourEvent) {
        match event {
            BehaviourEvent::Rr(event) => self.on_rr_event(event),
        }
    }

    #[tracing::instrument(skip(self))]
    fn on_rr_event(&mut self, event: request_response::Event<Request, Response>) {
        match event {
            request_response::Event::Message {
                peer,
                connection_id,
                message,
            } => {
                tracing::debug!(
                    "Received message from peer {peer} on connection {connection_id}: {message:?}"
                );
                self.on_rr_message_event(peer, connection_id, message);
            }
            failure @ request_response::Event::OutboundFailure { .. } => {
                tracing::error!("Outbound failure: {failure:?}")
            }
            request_response::Event::InboundFailure { .. }
            | request_response::Event::ResponseSent { .. } => {
                unreachable!("The protocol is outbound only, inbound events are not possible")
            }
        }
    }

    #[tracing::instrument(skip(self))]
    fn on_rr_message_event(
        &mut self,
        peer: PeerId,
        connection_id: ConnectionId,
        message: request_response::Message<Request, Response>,
    ) {
        let request_response::Message::Response {
            request_id,
            response,
        } = message
        else {
            unreachable!("The protocol is outbound only, no request messages can be received")
        };

        tracing::debug!("Received response: {response:?}");

        // We can safely replace the channel here because we know that it is only being used once
        // — i.e. we only reach this place once, a consequence of the nature of this whole function
        // We can't pass ownership down the call tree because the swarm is polled multiple times
        let (tx, _) = oneshot::channel();
        let result_tx = std::mem::replace(&mut self.result_tx, tx);
        if let Err(response) = result_tx.send(Ok(response)) {
            tracing::error!("Failed to send response ({response:?}), channel was dropped");
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Request {
    pub peer: PeerId,
}

#[derive(Debug, Deserialize, Serialize)]
pub enum Response {
    Found {
        peer: PeerId,
        maddrs: Vec<Multiaddr>,
    },
    NotFound {
        peer: PeerId,
    },
}

#[derive(NetworkBehaviour)]
struct Behaviour {
    rr: request_response::cbor::Behaviour<Request, Response>,
}

impl Behaviour {
    fn new() -> Self {
        let rr = request_response::cbor::Behaviour::new(
            [(StreamProtocol::new("/rr/1.0.0"), ProtocolSupport::Full)],
            Default::default(),
        );

        Self { rr }
    }
}

struct State {
    swarm: Swarm<Behaviour>,
}

impl State {
    async fn event_loop(&mut self, query: PeerId) -> Result<Vec<Multiaddr>, String> {
        loop {
            let event = self.swarm.select_next_some().await;
            match self.on_swarm_event(event, query) {
                Some(result) => return result,
                None => continue,
            }
        }
    }

    fn on_swarm_event(
        &mut self,
        event: SwarmEvent<BehaviourEvent>,
        query: PeerId,
    ) -> Option<Result<Vec<Multiaddr>, String>> {
        match event {
            SwarmEvent::Behaviour(event) => self.on_behaviour_event(event),
            SwarmEvent::ConnectionEstablished { peer_id, .. } => {
                self.swarm
                    .behaviour_mut()
                    .rr
                    .send_request(&peer_id, Request { peer: query });

                tracing::debug!("Sent request");
                None
            }
            _ => {
                tracing::debug!("Received unhandled event: {event:?}");
                None
            }
        }
    }

    fn on_behaviour_event(
        &mut self,
        event: BehaviourEvent,
    ) -> Option<Result<Vec<Multiaddr>, String>> {
        match event {
            BehaviourEvent::Rr(event) => match event {
                request_response::Event::Message {
                    peer,
                    connection_id,
                    message,
                } => match message {
                    request_response::Message::Response {
                        request_id,
                        response,
                    } => match response {
                        Response::Found { peer, maddrs } => {
                            tracing::info!("Found! {peer} {maddrs:?}");
                            return Some(Ok(maddrs));
                        }
                        Response::NotFound { peer } => {
                            tracing::error!("Not found: {response:?}");
                            return Some(Err("Not found".to_string()));
                        }
                    },
                    message => {
                        tracing::debug!("Received unhandled request: {message:?}");
                        None
                    }
                },
                request_response::Event::OutboundFailure { .. }
                | request_response::Event::InboundFailure { .. } => {
                    tracing::error!("Received failure event: {event:?}");
                    Some(Err(format!("{:?}", event)))
                }
                _ => {
                    tracing::debug!("Received unhandled RR event: {event:?}");
                    None
                }
            },
            _ => {
                tracing::debug!("Received unhandled behaviour event: {event:?}");
                None
            }
        }
    }
}
