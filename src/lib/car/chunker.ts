import { CID } from "multiformats/cid";
import * as raw from "multiformats/codecs/raw";
import { sha256 } from "multiformats/hashes/sha2";
import { CHUNK_SIZE } from "./consts";

export interface Chunk {
  cid: CID;
  bytes: Uint8Array;
  size: number;
}

/// Handles raw chunking and CID creation
export async function chunkFile(bytes: Uint8Array): Promise<Chunk[]> {
  const chunks: Chunk[] = [];

  if (bytes.length === 0) {
    const empty = new Uint8Array(0);
    const hash = await sha256.digest(raw.encode(empty));
    const cid = CID.create(1, raw.code, hash);
    chunks.push({ cid, bytes: empty, size: 0 });
  } else {
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunkBytes = bytes.slice(i, i + CHUNK_SIZE);
      const hash = await sha256.digest(raw.encode(chunkBytes));
      const cid = CID.create(1, raw.code, hash);
      chunks.push({ cid, bytes: chunkBytes, size: chunkBytes.length });
    }
  }

  return chunks;
}
