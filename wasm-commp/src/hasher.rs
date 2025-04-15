use rs_merkle::Hasher;
use sha2::{Digest, Sha256 as sha2Sha256};

/// A WASM-compatible SHA-256 hasher implementation for use with [`rs_merkle`].
///
/// This implementation uses [`sha2::Sha256`] under the hood and post-processes
/// the final hash by masking the last byte to 6 bits (as required by the
/// Filecoin piece commitment (CommP) specification).
///
/// This struct is suitable for environments targeting WebAssembly.
///
/// [`rs_merkle`]: https://docs.rs/rs-merkle/latest/rs_merkle/
/// [`sha2::Sha256`]: https://docs.rs/sha2/latest/sha2/struct.Sha256.html
#[derive(Clone)]
pub struct Sha256 {}

impl Hasher for Sha256 {
    type Hash = [u8; 32];

    /// Hashes the input using SHA-256, then masks the last byte to conform to the Filecoin spec.
    ///
    /// # Arguments
    /// * `data` - A byte slice representing the input data.
    ///
    /// # Returns
    /// A 32-byte array representing the hash value.
    fn hash(data: &[u8]) -> Self::Hash {
        let mut hasher = sha2Sha256::new();
        hasher.update(data);
        let mut h = [0u8; 32];
        h.copy_from_slice(hasher.finalize().as_ref());

        // Filecoin CommP requirement: last byte must have only the lowest 6 bits
        h[31] &= 0b0011_1111;

        h
    }
}
