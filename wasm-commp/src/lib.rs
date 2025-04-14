use std::io::{Cursor, Read};

use primitives::{
    commitment::{piece::PaddedPieceSize, CommP, Commitment},
    NODE_SIZE,
};
use rs_merkle::MerkleTree;
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

/// Generates the padded piece size and the CID for the given file bytes.
/// Returns the CommP
#[wasm_bindgen(js_name = "commpFromBytes")]
pub fn commp_from_bytes(data: &[u8]) -> Result<JsValue, JsValue> {
    let file_size = data.len() as u64;
    let padded_piece_size = PaddedPieceSize::from_arbitrary_size(file_size);
    // how many zeroes we need to add, so after Fr32 padding it'll be a power of two
    let padded_with_zeroes = *padded_piece_size.unpadded();
    let buffered = Cursor::new(data);
    let mut zero_padding_reader = ZeroPaddingReader::new(buffered, padded_with_zeroes);
    let commitment =
        calculate_piece_commitment(&mut zero_padding_reader, padded_piece_size).unwrap();

    log(&format!("CID from Rust: {}", commitment.cid()));

    Ok(JsValue::from_str(&commitment.cid().to_string()))
}

/// Computes the padded piece size of the given CAR file data.
/// Returns the padded piece size
#[wasm_bindgen(js_name = "paddedPieceSize")]
pub fn padded_piece_size(data: &[u8]) -> Result<JsValue, JsValue> {
    let file_size = data.len() as u64;
    let padded_piece_size = PaddedPieceSize::from_arbitrary_size(file_size);

    log(&format!(
        "Padded Piece Size from Rust: {}",
        padded_piece_size
    ));

    Ok(JsValue::from_str(&padded_piece_size.to_string()))
}

/// Calculate the piece commitment for a given data source.
///
///  Reference — <https://spec.filecoin.io/systems/filecoin_files/piece/#section-systems.filecoin_files.piece.data-representation>
pub fn calculate_piece_commitment<R: Read>(
    source: R,
    piece_size: PaddedPieceSize,
) -> Result<Commitment<CommP>, JsValue> {
    // This reader adds two zero bits to each 254 bits of data read from the source.
    let mut fr32_reader = Fr32Reader::new(source);

    // Buffer used for reading data used for leafs.
    let mut buffer = [0; NODE_SIZE];
    // Number of leafs
    let num_leafs = piece_size.div_ceil(NODE_SIZE as u64) as usize;

    // WASM compatible sha256 hasher and a BinaryMerkleTree.
    // Elements iterator used by the MerkleTree. The elements returned by the
    // iterator represent leafs of the tree
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
