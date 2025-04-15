use std::io::{Cursor, Read};

use primitives::{
    commitment::{piece::PaddedPieceSize, CommP, Commitment},
    NODE_SIZE,
};
use rs_merkle::MerkleTree;
use tracing::info;
use tracing_subscriber::fmt::format::Pretty;
use tracing_subscriber::prelude::*;
use tracing_web::{performance_layer, MakeWebConsoleWriter};
use wasm_bindgen::prelude::*;

use crate::{fr32_reader::Fr32Reader, hasher::Sha256, zero_reader::ZeroPaddingReader};

mod fr32_reader;
mod hasher;
mod zero_reader;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/// Set up a logging layer that direct logs to the browser's console.
#[wasm_bindgen(start)]
pub fn setup_logging() {
    log(&format!("Initializing logging..."));

    let fmt_layer = tracing_subscriber::fmt::layer()
        .with_ansi(false) // Only partially supported across browsers
        .without_time() // std::time is not available in browsers
        .with_writer(MakeWebConsoleWriter::new()); // write events to the console
    let perf_layer = performance_layer().with_details_from_fields(Pretty::default());

    tracing_subscriber::registry()
        .with(fmt_layer)
        .with(perf_layer)
        .init();

    info!("Logging initialized");
}

/// Generates the CommP (piece commitment) from the input file bytes.
///
/// This function:
/// 1. Calculates the padded piece size.
/// 2. Applies zero-padding to the original bytes.
/// 3. Applies Fr32 padding.
/// 4. Builds a Merkle tree from 32-byte nodes.
/// 5. Returns the Merkle root (CommP) as a CID.
///
/// # Arguments
/// * `data` - The original unpadded file bytes.
///
/// # Returns
/// A JS string containing the CID.
#[wasm_bindgen(js_name = "commpFromBytes")]
pub fn commp_from_bytes(data: &[u8]) -> Result<JsValue, JsValue> {
    let file_size = data.len() as u64;
    let padded_piece_size = PaddedPieceSize::from_arbitrary_size(file_size);

    // Compute unpadded size, apply zero-padding accordingly
    let padded_with_zeroes = *padded_piece_size.unpadded();
    let buffered = Cursor::new(data);
    let mut zero_padding_reader = ZeroPaddingReader::new(buffered, padded_with_zeroes);

    let commitment =
        calculate_piece_commitment(&mut zero_padding_reader, padded_piece_size).unwrap();

    info!("CID from Rust: {}", commitment.cid());

    Ok(JsValue::from_str(&commitment.cid().to_string()))
}

/// Computes the padded piece size of a CAR file buffer according to Filecoin specs.
///
/// # Arguments
/// * `data` - The full file buffer (e.g. a CAR file).
///
/// # Returns
/// A JS string representing the padded piece size in bytes.
#[wasm_bindgen(js_name = "paddedPieceSize")]
pub fn padded_piece_size(data: &[u8]) -> Result<JsValue, JsValue> {
    let file_size = data.len() as u64;
    let padded_piece_size = PaddedPieceSize::from_arbitrary_size(file_size);

    info!("Padded Piece Size from Rust: {}", padded_piece_size);

    Ok(JsValue::from_str(&padded_piece_size.to_string()))
}

/// Calculates the piece commitment (CommP) for a data stream with a given padded piece size.
///
/// This function:
/// - Wraps the input in an `Fr32Reader` to apply Fr32 bit-padding.
/// - Splits data into `NODE_SIZE` chunks to generate Merkle tree leaves.
/// - Constructs a Merkle tree using `Sha256` (masked).
/// - Returns the root hash as a `Commitment<CommP>`.
///
/// # Arguments
/// * `source` - A reader over the padded input data.
/// * `piece_size` - The padded piece size in bytes.
///
/// # Returns
/// A `Commitment<CommP>` containing the Merkle root.
pub fn calculate_piece_commitment<R: Read>(
    source: R,
    piece_size: PaddedPieceSize,
) -> Result<Commitment<CommP>, JsValue> {
    let mut fr32_reader = Fr32Reader::new(source);
    let mut buffer = [0; NODE_SIZE];
    let num_leafs = piece_size.div_ceil(NODE_SIZE as u64) as usize;

    let leaves = (0..num_leafs)
        .map(|_| {
            fr32_reader.read_exact(&mut buffer).unwrap();
            buffer
        })
        .collect::<Vec<[u8; 32]>>();

    let tree = MerkleTree::<Sha256>::from_leaves(&leaves);
    let raw = tree.root().unwrap();

    Ok(raw.into())
}
