use libp2p::{
    core,
    futures::{channel::oneshot, select, StreamExt},
    identify,
    identity::{self, Keypair},
    noise,
    request_response::{self, ProtocolSupport},
    swarm::{self, ConnectionId, NetworkBehaviour, SwarmEvent},
    websocket_websys as websocket, yamux, Multiaddr, PeerId, StreamProtocol, Transport,
};
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use tracing::level_filters::LevelFilter;
use tracing_subscriber::{
    fmt::time::UtcTime, layer::SubscriberExt, util::SubscriberInitExt, Layer,
};
use wasm_bindgen::prelude::*;

/// Setup browser logging.
#[wasm_bindgen(js_name = "setupLogging")]
pub fn setup_logging() -> Result<(), JsError> {
    console_error_panic_hook::set_once();

    let fmt_layer = tracing_subscriber::fmt::layer()
        .with_ansi(false)
        .with_timer(UtcTime::rfc_3339()) // std::time is not available in browsers
        .with_writer(tracing_web::MakeConsoleWriter) // write events to the console
        .with_filter(LevelFilter::DEBUG);

    tracing_subscriber::registry()
        .with(fmt_layer)
        .try_init()
        .map_err(|err| JsError::new(err.to_string().as_str()))
}

/// Resolve a provided PeerId by connecting to the provided bootnodes.
#[wasm_bindgen(js_name = "resolvePeerId")]
pub async fn resolve_peer_id(
    bootnodes: Vec<String>,
    query: String,
) -> Result<Vec<String>, JsError> {
    let bootnodes = bootnodes
        .into_iter()
        .map(|s| Multiaddr::from_str(&s))
        .collect::<Result<Vec<Multiaddr>, _>>()?;

    let query = PeerId::from_str(&query)?;
    tracing::info!("Query: {}", query);

    // This node is ephemeral so we don't care for the actual identity
    // we can read it from the user selected account but to query the DHT it doesn't make a difference
    let identity = identity::Keypair::generate_ed25519();

    match Swarm::new(&identity, query)?.start(bootnodes).await? {
        Response::Found { maddrs } => Ok(maddrs
            .into_iter()
            .map(|maddr| Multiaddr::to_string(&maddr))
            .collect()),
        Response::NotFound { peer } => Err(JsError::new(
            format!("Could not resolve peer's {peer} multiaddresses").as_str(),
        )),
    }
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
                Behaviour::new(identity.public()),
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
                let request = Request { peer: self.query };
                tracing::debug!(
                    "Connection to peer {peer_id} was established, sending request: {request:?}"
                );
                self.inner
                    .behaviour_mut()
                    .rr
                    .send_request(&peer_id, request);
            }
            SwarmEvent::Behaviour(event) => self.on_behaviour_event(event),
            _ => tracing::trace!("Unhandled swarm event: {event:?}"),
        }
    }

    fn on_behaviour_event(&mut self, event: BehaviourEvent) {
        match event {
            BehaviourEvent::Rr(event) => self.on_rr_event(event),
            BehaviourEvent::Identify(event) => {
                tracing::trace!("Unhandled identify behaviour event: {event:?}")
            }
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
        let request_response::Message::Response { response, .. } = message else {
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
    Found { maddrs: Vec<Multiaddr> },
    NotFound { peer: PeerId },
}

/// The request-response protocol name.
const RESOLVE_PEER_ID_PROTOCOL_NAME: &str = "/polka-storage/rr/resolve-peer-id/1.0.0";
/// The request-response [`StreamProtocol`].
const RESOLVE_PEER_ID_STREAM_PROTOCOL: StreamProtocol =
    StreamProtocol::new(RESOLVE_PEER_ID_PROTOCOL_NAME);
/// The request-response protocol supported by this "end" — the client.
const RESOLVE_PEER_ID_PROTOCOL: (StreamProtocol, ProtocolSupport) =
    (RESOLVE_PEER_ID_STREAM_PROTOCOL, ProtocolSupport::Outbound);

#[derive(NetworkBehaviour)]
struct Behaviour {
    identify: identify::Behaviour,
    rr: request_response::cbor::Behaviour<Request, Response>,
}

impl Behaviour {
    fn new(local_public_key: identity::PublicKey) -> Self {
        let identify = identify::Behaviour::new(identify::Config::new(
            "/polka-storage/id/1.0.0".to_string(),
            local_public_key,
        ));
        Self {
            identify,
            rr: request_response::cbor::Behaviour::new(
                [RESOLVE_PEER_ID_PROTOCOL],
                Default::default(),
            ),
        }
    }
}
