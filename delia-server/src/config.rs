use std::{net::SocketAddr, path::PathBuf};

use multiaddr::Multiaddr;

#[derive(Debug, Clone, clap::Parser)]
pub struct Config {
    /// Server listening address.
    #[arg(short = 'l', long, default_value = "0.0.0.0:50000")]
    pub listen_address: SocketAddr,

    /// Path to the application static files.
    #[arg(long, default_value = "static")]
    pub serve_directory: PathBuf,

    /// Libp2p Kademlia DHT bootnodes.
    #[arg(long, value_delimiter = ',', num_args = 1..)]
    pub bootnodes: Vec<Multiaddr>,
}
