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
    if data.is_empty() {
        return Err(JsValue::from_str("Input data must not be empty"));
    }

    let file_size = data.len() as u64;
    let padded_piece_size = PaddedPieceSize::from_arbitrary_size(file_size);

    // Compute unpadded size, apply zero-padding accordingly
    let padded_with_zeroes = *padded_piece_size.unpadded();
    let buffered = Cursor::new(data);
    let mut zero_padding_reader = ZeroPaddingReader::new(buffered, padded_with_zeroes);

    let commitment = calculate_piece_commitment(&mut zero_padding_reader, padded_piece_size)?;

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

    // Use a `for` loop instead of `.map()` so we can use the `?` operator
    // for proper error propagation when reading from the Fr32Reader.
    let mut leaves = Vec::with_capacity(num_leafs);
    for _ in 0..num_leafs {
        fr32_reader
            .read_exact(&mut buffer)
            .map_err(|e| JsValue::from_str(&format!("Read error: {}", e)))?;
        leaves.push(buffer);
    }

    let tree = MerkleTree::<Sha256>::from_leaves(&leaves);
    let raw = tree
        .root()
        .ok_or_else(|| JsValue::from_str("Merkle tree is empty"))?;

    Ok(raw.into())
}

#[cfg(test)]
mod tests {
    use super::*;
    use wasm_bindgen_test::wasm_bindgen_test;

    /// Macro for testing the `padded_piece_size` function with specific input sizes.
    ///
    /// Parameters:
    /// - `$name`: The name of the generated test function.
    /// - `$input_size`: The number of bytes in the input buffer.
    /// - `$expected`: The expected padded piece size as a string.
    ///
    /// This macro:
    /// 1. Constructs a buffer of `$input_size` bytes (zeroed),
    /// 2. Calls `padded_piece_size()` on the buffer,
    /// 3. Asserts that the returned string matches `$expected`.
    macro_rules! padded_piece_test {
        ($name:ident, $input_size:expr, $expected:expr) => {
            #[wasm_bindgen_test]
            fn $name() {
                let data = vec![0; $input_size];
                let result = padded_piece_size(&data).unwrap().as_string().unwrap();
                assert_eq!(
                    result, $expected,
                    "input: {} bytes, expected padded size: {}, got: {}",
                    $input_size, $expected, result
                );
            }
        };
    }

    // Input is 127 bytes, just below the 128 threshold.
    // Should round up to 128 padded bytes.
    padded_piece_test!(padded_127_bytes, 127, "128");
    // Input is exactly 128 bytes.
    // Because of the `(size + size/127)` rule, it becomes 129 -> next_power_of_two = 256.
    padded_piece_test!(padded_128_bytes, 128, "256");
    // Input is 254 bytes, which becomes 256 after formula,
    // and 256 is already a power of two.
    padded_piece_test!(padded_254_bytes, 254, "256");
    // Input is 1024 bytes, becomes 1032 -> next_power_of_two = 2048.
    padded_piece_test!(padded_1024_bytes, 1024, "2048");
    // Input is 3000 bytes, padded to 3023 -> next_power_of_two = 4096.
    padded_piece_test!(padded_3000_bytes, 3000, "4096");
    // Input is exactly 4096 bytes, becomes 4128 -> next_power_of_two = 8192.
    padded_piece_test!(padded_4096_bytes, 4096, "8192");

    /// Macro for defining CommP-related tests.
    ///
    /// Parameters:
    /// - `$name`: The name of the test function.
    /// - `$input`: The input byte array for `commp_from_bytes`.
    /// - `|$cid|`: A binding name for the resulting CID string inside the test block.
    /// - `$assert`: The test body block that receives the CID and performs assertions.
    ///
    /// This macro expands into a `#[wasm_bindgen_test]` function that:
    /// 1. Calls `commp_from_bytes` on the given input,
    /// 2. Binds the resulting CID string to the given identifier,
    /// 3. Executes the assertion block using that CID.
    macro_rules! commp_case {
        ($name:ident, $input:expr, |$cid:ident| $assert:block) => {
            #[wasm_bindgen_test]
            fn $name() {
                let $cid = commp_from_bytes(&$input).unwrap().as_string().unwrap();
                $assert
            }
        };
    }

    // Ensure that repeated calls with the same input yield the same CID (deterministic behavior).
    commp_case!(same_input_same_cid, vec![0x42; 127], |cid| {
        let cid2 = commp_from_bytes(&vec![0x42; 127])
            .unwrap()
            .as_string()
            .unwrap();
        assert_eq!(cid, cid2, "CID must be identical across same input");
    });

    // Ensure that different input content produces different CIDs.
    commp_case!(different_input_different_cid, vec![0x00; 127], |cid| {
        let cid2 = commp_from_bytes(&vec![0xFF; 127])
            .unwrap()
            .as_string()
            .unwrap();
        assert_ne!(cid, cid2, "Different input should yield different CID");
    });

    // Ensure that the generated CID follows the expected CIDv1 format ("baga..." prefix).
    commp_case!(cid_has_expected_prefix, vec![0x42; 127], |cid| {
        assert!(cid.starts_with("baga"), "CID should start with baga");
    });

    // Ensure that the generated CID is 64 bytes
    commp_case!(cid_length_is_consistent, vec![0x42; 127], |cid| {
        assert_eq!(cid.len(), 64, "CID length should match 64");
    });

    #[wasm_bindgen_test]
    fn commp_rejects_empty_input() {
        let result = commp_from_bytes(&[]);
        assert!(result.is_err(), "Empty input should result in error");
    }
}
