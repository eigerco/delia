use std::net::SocketAddr;
use std::path::PathBuf;

use axum::{
    extract::{Query, State},
    http::{header, Method, StatusCode},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use libp2p::PeerId;
use serde::Deserialize;
use tokio::sync::{mpsc, oneshot};
use tower_http::{
    cors::{Any, CorsLayer},
    services::ServeDir,
    trace::{DefaultOnFailure, DefaultOnRequest, DefaultOnResponse, TraceLayer},
};
use tracing::{warn_span, Instrument};

use crate::swarm::SwarmRequest;

pub struct HttpConfig {
    pub listen_address: SocketAddr,
    pub serve_directory: PathBuf,
}

#[derive(Clone)]
struct ApiState {
    swarm_tx: mpsc::UnboundedSender<SwarmRequest>,
}

pub async fn start_http_server(
    config: HttpConfig,
    swarm_tx: mpsc::UnboundedSender<SwarmRequest>,
) -> Result<(), std::io::Error> {
    // TODO: replace the static addr
    let listener = tokio::net::TcpListener::bind(config.listen_address).await?;
    tracing::info!("Listening on http://{}", config.listen_address);

    let api = configure_api_router(swarm_tx);

    let router = configure_router(config.serve_directory, api);

    axum::serve(listener, router)
        .with_graceful_shutdown(
            async move {
                // TODO: this is only ctrl+c and not sigterm
                match tokio::signal::ctrl_c().await {
                    Ok(()) => tracing::warn!("CTRL+C received, shutting down"),
                    Err(err) => {
                        tracing::error!("Failed to wait for CTRL+C with error: {err}");
                        tracing::error!("Shutting down");
                    }
                };
            }
            .instrument(warn_span!("shutdown_signal")),
        )
        .await
}

fn configure_router(serve_directory: PathBuf, api: Router) -> Router {
    // TODO: review this CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE])
        .max_age(std::time::Duration::from_secs(3600));

    let serve_dir = ServeDir::new(serve_directory);

    Router::new()
        // Versioned just in case
        .nest("/api/v0", api)
        .fallback_service(serve_dir)
        .layer(cors)
        .layer(
            TraceLayer::new_for_http()
                .on_request(DefaultOnRequest::default())
                .on_response(DefaultOnResponse::default())
                .on_failure(DefaultOnFailure::default()),
        )
}

fn configure_api_router(swarm_tx: mpsc::UnboundedSender<SwarmRequest>) -> Router {
    let state = ApiState { swarm_tx };

    Router::new()
        .route("/resolve_peer_id", get(resolve_peer_id))
        .with_state(state)
}

#[derive(Debug, Deserialize)]
struct ResolvePeerIdQuery {
    peer_id: PeerId,
}

async fn resolve_peer_id(
    State(state): State<ApiState>,
    // Instead of a query, the ideal here would be a JSON body, so we have more flexiblity with requests
    Query(ResolvePeerIdQuery { peer_id }): Query<ResolvePeerIdQuery>,
) -> impl IntoResponse {
    let (response_tx, response_rx) = oneshot::channel();

    if let Err(err) = state.swarm_tx.send(SwarmRequest::QueryPeerId {
        peer_id,
        response_tx,
    }) {
        tracing::error!(%peer_id, "Failed to send request to swarm with error: {err}");
        return Err(failed_to_resolve_peer_id(peer_id));
    }

    let response = response_rx.await;
    match response {
        Ok(Ok(maddrs)) => Ok(Json(maddrs)),
        Ok(Err(err)) => {
            tracing::error!("Failed to resolve peer id with error: {err}");
            // TODO: the returned status code can (and should) be improved
            // by replacing the anyhow usage with a proper enum
            Err((StatusCode::NOT_FOUND, err.to_string()))
        }
        Err(err) => {
            tracing::error!("Failed to receive response from swarm with error: {err}");
            Err(failed_to_resolve_peer_id(peer_id))
        }
    }
}

#[inline(always)]
fn failed_to_resolve_peer_id(peer_id: PeerId) -> (StatusCode, String) {
    return (
        StatusCode::INTERNAL_SERVER_ERROR,
        format!("Failed to resolve PeerId: {peer_id}"),
    );
}
