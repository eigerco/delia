import { CarBufferWriter, CarWriter } from "@ipld/car";
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
  const offset = CarBufferWriter.headerLength({ roots: [rootCID] });

  const blockQueue = createBlockQueue(nodes);
  const indexEntries = new Array<IndexEntry>(blockQueue.length);
  const writtenBlocks = new Set<string>();
  const carChunks: Uint8Array[] = [];

  const collectPromise = collectChunksAndOffsets(
    out,
    blockQueue,
    writtenBlocks,
    indexEntries,
    carChunks,
    offset,
  );

  for (const [cidStr, bytes] of nodes.entries()) {
    const cid = CID.parse(cidStr);
    await writer.put({ cid, bytes });
  }

  await writer.close();
  await collectPromise;

  const carBytes = concatChunks(carChunks);

  return {
    carBytes,
    indexEntries,
  };
}

/**
 * Constructs a block queue from the input node map, preserving insertion order.
 *
 * @param nodes - A map of CID string to block data.
 * @returns An array of [CID string, CID] pairs.
 */
function createBlockQueue(nodes: Map<string, Uint8Array>): [string, CID][] {
  const blockQueue = new Array<[string, CID]>(nodes.size);
  let i = 0;
  for (const key of nodes.keys()) {
    blockQueue[i++] = [key, CID.parse(key)];
  }
  return blockQueue;
}

/**
 * Collects chunks emitted from the CAR writer output and tracks block offsets to build an index.
 *
 * @param out - The async iterable stream of CAR chunks.
 * @param blockQueue - Array of [CID string, CID] representing the expected block write order.
 * @param writtenBlocks - A Set tracking which blocks have been indexed already.
 * @param indexEntries - The array to store offset information for each block.
 * @param carChunks - Accumulator array for CAR chunks.
 * @param offset - The current byte offset.
 */
async function collectChunksAndOffsets(
  out: AsyncIterable<Uint8Array>,
  blockQueue: [string, CID][],
  writtenBlocks: Set<string>,
  indexEntries: IndexEntry[],
  carChunks: Uint8Array[],
  offset: number,
): Promise<void> {
  let blockIndex = 0;
  let current_offset = offset;

  for await (const chunk of out) {
    carChunks.push(chunk);

    for (; blockIndex < blockQueue.length; blockIndex++) {
      const [cidStr, cid] = blockQueue[blockIndex];
      if (!writtenBlocks.has(cidStr)) {
        writtenBlocks.add(cidStr);

        indexEntries[blockIndex] = {
          multihash: cid.multihash.bytes,
          offset,
        };
        break;
      }
    }
    current_offset += chunk.length;
  }
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

  entries.sort((a, b) => u8aCmp(a.multihash, b.multihash));

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
    numberToU32LE(0x01), // unique widths under the same multihash code (always one for SHA256)
    numberToU32LE(entrySize), // digest + offset length
    numberToU64LE(entrySize * entriesCount), // total length ((digest + offset) * entries)
  );
}
