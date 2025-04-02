use std::collections::HashMap;

use libp2p::{
    core,
    futures::StreamExt,
    identity::{self, Keypair},
    kad, noise,
    swarm::{self, NetworkBehaviour},
    tcp, yamux, Multiaddr, PeerId, Transport,
};
use tokio::sync::{
    mpsc::{self, UnboundedReceiver, UnboundedSender},
    oneshot,
};

pub fn extract_peer_id(maddr: &Multiaddr) -> Option<PeerId> {
    match maddr.iter().last() {
        Some(core::multiaddr::Protocol::P2p(peer_id)) => Some(peer_id),
        _ => None,
    }
}

#[derive(NetworkBehaviour)]
struct Behaviour {
    kad: kad::Behaviour<kad::store::MemoryStore>,
}

impl Behaviour {
    fn new(identity: &Keypair, bootnodes: Vec<Multiaddr>) -> Self {
        let peer_id = identity.public().to_peer_id();
        let store = kad::store::MemoryStore::new(peer_id);

        let mut kad = kad::Behaviour::new(peer_id, store);
        for node in bootnodes {
            match extract_peer_id(&node) {
                Some(peer_id) => {
                    kad.add_address(&peer_id, node);
                }
                None => {
                    tracing::warn!("Bootnode address MUST have a /p2p protocol; ignoring...");
                }
            }
        }

        Self { kad }
    }
}

pub struct Config {
    pub bootnodes: Vec<Multiaddr>,
}

pub struct Swarm {
    inner: swarm::Swarm<Behaviour>,
    request_rx: UnboundedReceiver<SwarmRequest>,

    // TODO: define the error
    inflight_kad_queries:
        HashMap<kad::QueryId, oneshot::Sender<Result<Vec<Multiaddr>, anyhow::Error>>>,
}

impl Swarm {
    pub fn new(config: Config) -> (Self, UnboundedSender<SwarmRequest>) {
        // NOTE(@jmg-duarte,02/04/2025): maybe we can have the user provide the identity
        // but for this use-case it doesn't much difference
        let identity = identity::Keypair::generate_ed25519();

        let noise_config = noise::Config::new(&identity)
            .expect("This should never fail given that the Identity should always be valid");
        let yamux_config = yamux::Config::default();
        let transport = tcp::tokio::Transport::default()
            .upgrade(core::upgrade::Version::V1Lazy)
            .authenticate(noise_config)
            .multiplex(yamux_config)
            .boxed();

        let behaviour = Behaviour::new(&identity, config.bootnodes);

        let (req_tx, req_rx) = mpsc::unbounded_channel::<SwarmRequest>();

        (
            Self {
                inner: swarm::Swarm::new(
                    transport,
                    behaviour,
                    identity.public().to_peer_id(),
                    swarm::Config::with_tokio_executor(),
                ),
                request_rx: req_rx,
                inflight_kad_queries: HashMap::new(),
            },
            req_tx,
        )
    }

    pub async fn start(&mut self) -> Result<(), anyhow::Error> {
        // TODO: graceful shutdown
        loop {
            tokio::select! {
                event = self.inner.select_next_some() => {
                    match event {
                        swarm::SwarmEvent::Behaviour(event) => self.handle_behaviour_event(event),
                        _ => tracing::debug!("Received unhandled swarm event: {event:?}"),
                    }
                }
                request = self.request_rx.recv() => {
                    match request {
                        Some(request) => self.handle_swarm_request(request),
                        None => {
                            tracing::warn!("Channel was closed, stopping processing...");
                            return Ok(());
                        },
                    }
                }
            }
        }
    }

    fn handle_swarm_request(&mut self, request: SwarmRequest) {
        match request {
            SwarmRequest::QueryPeerId {
                peer_id,
                response_tx,
            } => {
                let query_id = self
                    .inner
                    .behaviour_mut()
                    .kad
                    .get_record(kad::RecordKey::new(&peer_id.to_bytes()));
                self.inflight_kad_queries.insert(query_id, response_tx);
            }
        }
    }

    fn handle_behaviour_event(&mut self, event: BehaviourEvent) {
        match event {
            BehaviourEvent::Kad(event) => self.handle_kad_event(event),
        }
    }

    fn handle_kad_event(&mut self, event: kad::Event) {
        match event {
            kad::Event::OutboundQueryProgressed {
                id,
                // NOTE(@jmg-duarte,02/04/2025): according to the code for `get_record`,
                // this is the only variant of `GetRecordOk` that is returned by it
                result: kad::QueryResult::GetRecord(Ok(kad::GetRecordOk::FoundRecord(ok))),
                ..
            } => {
                // TODO: map the query id to a channel
                match self.inflight_kad_queries.remove(&id) {
                    Some(response_channel) => {
                        // Failing to send the response may be an isolated incident or not, but we can't tell here
                        if let Err(_) = match cbor4ii::serde::from_slice(&ok.record.value) {
                            Ok(maddrs) => {
                                tracing::trace!(query_id = %id, "Successfully fetched record");
                                response_channel.send(Ok(maddrs))
                            }
                            Err(err) => {
                                tracing::error!(
                                    query_id = %id,
                                    "Failed to deserialize received record with error: {err}"
                                );
                                response_channel.send(Err(err.into()))
                            }
                        } {
                            tracing::error!(query_id = %id, "Failed to send response.")
                        }
                    }
                    None => {
                        tracing::warn!(query_id = %id, "Received a GetRecord response for a non-existing entry in the channel, ignoring...");
                    }
                }
            }

            kad::Event::OutboundQueryProgressed {
                id,
                result: kad::QueryResult::GetRecord(Err(err)),
                ..
            } => {
                tracing::error!(query_id = %id, "GetRecord failed with error: {err}");
                match self.inflight_kad_queries.remove(&id) {
                    Some(response_channel) => {
                        if let Err(_) = response_channel.send(Err(err.into())) {
                            tracing::error!(query_id = %id, "Failed to send response.")
                        }
                    }
                    None => {
                        tracing::warn!(query_id = %id, "Received a GetRecord response for a non-existing entry in the channel, ignoring...");
                    }
                }
            }
            _ => tracing::debug!("Received unhandled Kad event: {event:?}"),
        }
    }
}

/// Represents a request to the swarm.
// Currently has only one member and said member contains the response channel,
// maybe this channel requirement could be inverted and instead be:
// `struct SwarmRequest(Request, oneshot::Sender)`
// But this would make all requests require a response, currently,
// this is slightly simpler, so, we'll see
pub enum SwarmRequest {
    QueryPeerId {
        peer_id: PeerId,
        response_tx: oneshot::Sender<Result<Vec<Multiaddr>, anyhow::Error>>,
    },
}
