import { CarIndexer, CarWriter } from "@ipld/car";
import { u8aCmp, u8aConcat } from "@polkadot/util";
import { CID } from "multiformats/cid";
import { encode } from "uint8-varint";
import { numberToU32LE, numberToU64LE } from "./bytes";
import { MULTIHASH_INDEX_SORTED_CODE, SHA_256_CODE } from "./consts";

/**
 * Represents a mapping from a multihash to its byte offset in the CAR file.
 */
export interface IndexEntry {
  multihash: Uint8Array;
  digest: Uint8Array;
  offset: number;
}

/**
 * Writes a CARv1 file from a map of CIDs to block data, and returns the raw bytes and index entries.
 *
 * @param nodes - A map of CID string to corresponding block data.
 * @param rootCID - The root CID of the DAG to be used in the CAR file header.
 * @returns A Promise resolving to an object containing the CAR file bytes and an array of multihash index entries.
 */
export async function writeCarFileWithOffsets(
  nodes: Map<string, Uint8Array>,
  rootCID: CID,
): Promise<{ carBytes: Uint8Array; indexEntries: IndexEntry[] }> {
  const { writer, out } = await CarWriter.create([rootCID]);

  const carChunks: Uint8Array[] = [];

  // Actively drain the writer output
  const drain = (async () => {
    for await (const chunk of out) {
      carChunks.push(chunk);
    }
  })();

  for (const [cidStr, bytes] of nodes.entries()) {
    const cid = CID.parse(cidStr);
    await writer.put({ cid, bytes });
  }

  await writer.close();
  await drain;

  const carBytes = concatChunks(carChunks);

  const indexer = await CarIndexer.fromBytes(carBytes);
  const indexEntries: IndexEntry[] = [];
  for await (const blockIndex of indexer) {
    console.log(JSON.stringify(blockIndex));
    indexEntries.push({
      multihash: blockIndex.cid.multihash.bytes,
      offset: blockIndex.offset,
      digest: blockIndex.cid.multihash.digest,
    });
  }

  return {
    carBytes,
    indexEntries,
  };
}

/**
 * Concatenates an array of Uint8Arrays into a single contiguous Uint8Array.
 *
 * @param chunks - The list of byte chunks to merge.
 * @returns The merged Uint8Array.
 */
function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let position = 0;
  for (const chunk of chunks) {
    result.set(chunk, position);
    position += chunk.length;
  }
  return result;
}

/**
 * Builds a multihash index in the "multihash index sorted" format as defined by CARv2.
 *
 * @param entries - The array of index entries containing multihash and offset.
 * @returns The encoded multihash index as a Uint8Array.
 * @throws If entries is empty or any digest length is incorrect.
 */
export function buildMultihashIndexSorted(entries: IndexEntry[]): Uint8Array {
  if (entries.length === 0) {
    throw new Error("Cannot build index from 0 entries.");
  }

  entries.sort((a, b) => u8aCmp(a.digest, b.digest));

  const parts: Uint8Array[] = [];
  parts.push(indexHeader(entries.length));

  for (const { multihash, offset } of entries) {
    parts.push(buildIndexEntry(multihash, offset));
  }

  return u8aConcat(...parts);
}

/**
 * Encodes a single 40-byte multihash index entry (digest + offset).
 *
 * @param multihash - The full multihash (must be SHA-256, 34 bytes with 2-byte prefix).
 * @param offset - The byte offset of the corresponding block in the CAR file.
 * @returns The binary-encoded index entry.
 */
function buildIndexEntry(multihash: Uint8Array, offset: number): Uint8Array {
  const digest = multihash.slice(2); // strip 2-byte prefix
  if (digest.length !== 32) {
    throw new Error(`Unexpected digest length: ${digest.length}`);
  }

  const offsetBytes = numberToU64LE(offset);
  const entry = new Uint8Array(40);
  entry.set(digest, 0);
  entry.set(offsetBytes, 32);
  return entry;
}

/**
 * Builds the header for the multihash index sorted format.
 *
 * @param entriesCount - Number of entries in the index.
 * @returns The binary-encoded header.
 */
export function indexHeader(entriesCount: number): Uint8Array {
  const entrySize = 0x28; // Size of digest (32 bytes) + offset (8 bytes)

  return u8aConcat(
    encode(MULTIHASH_INDEX_SORTED_CODE), // multicodec varint
    numberToU32LE(0x01), // digest bucket length
    numberToU64LE(SHA_256_CODE), // multihash code
    numberToU32LE(0x01), // unique digest lengths in the same mulithash code (always 1 for SHA256)
    numberToU32LE(entrySize), // digest + offset length
    numberToU64LE(entrySize * entriesCount), // total length ((digest + offset) * entries)
  );
}
