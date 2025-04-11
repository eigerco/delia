use rs_merkle::Hasher;
use sha2::{Digest, Sha256 as sha2Sha256};

#[derive(Clone)]
pub struct Sha256 {}

impl Hasher for Sha256 {
    type Hash = [u8; 32];

    fn hash(data: &[u8]) -> Self::Hash {
        let mut hasher = sha2Sha256::new();
        hasher.update(data);
        let mut h = [0u8; 32];
        h.copy_from_slice(hasher.finalize().as_ref());
        h[31] &= 0b0011_1111;
        h
    }
}
