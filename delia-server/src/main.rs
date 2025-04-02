mod config;
mod http;
mod swarm;

use clap::Parser;
use config::Config;
use futures::TryFutureExt;
use http::{start_http_server, HttpConfig};
use swarm::Swarm;
use tokio::task::JoinSet;
use tracing::Level;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

fn main() -> Result<(), anyhow::Error> {
    setup_logging()?;

    let config = Config::parse();

    Ok(tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("Failed to build the runtime")
        .block_on(start(config))?)
}

fn setup_logging() -> Result<(), anyhow::Error> {
    Ok(tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(
            EnvFilter::builder()
                .with_default_directive(Level::INFO.into())
                .from_env()?,
        )
        .try_init()?)
}

async fn start(config: Config) -> Result<(), anyhow::Error> {
    let (mut swarm, swarm_tx) = Swarm::new(swarm::Config {
        bootnodes: config.bootnodes,
    });

    // TODO: implement graceful shutdown - should need to remove the joinset
    let mut tasks = JoinSet::new();
    tasks.spawn(async move { swarm.start().await });
    tasks.spawn(
        start_http_server(
            HttpConfig {
                listen_address: config.listen_address,
                serve_directory: config.serve_directory,
            },
            swarm_tx,
        )
        .map_err(|err| anyhow::Error::from(err)),
    );

    tasks
        .join_all()
        .await
        .into_iter()
        .collect::<Result<(), anyhow::Error>>()
}
