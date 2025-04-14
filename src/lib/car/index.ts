import { CarBufferWriter, CarWriter } from "@ipld/car";
import { u8aCmp, u8aConcat } from "@polkadot/util";
import { CID } from "multiformats/cid";
import { encode } from "uint8-varint";
import { numberToU32LE, numberToU64LE } from "./bytes";
import { MULTIHASH_INDEX_SORTED_CODE, SHA_256_CODE } from "./consts";

export interface IndexEntry {
  multihash: Uint8Array;
  offset: number;
}

export async function writeCarFileWithOffsets(
  nodes: Map<string, Uint8Array>,
  rootCID: CID,
): Promise<{ carBytes: Uint8Array; indexEntries: IndexEntry[] }> {
  const { writer, out } = await CarWriter.create([rootCID]);
  let offset = CarBufferWriter.headerLength({ roots: [rootCID] });

  const numBlocks = nodes.size;
  const blockQueue = new Array<[string, CID]>(numBlocks);
  const indexEntries = new Array<IndexEntry>(numBlocks);
  const writtenBlocks = new Set<string>();

  // Pre-fill blockQueue
  let i = 0;
  for (const key of nodes.keys()) {
    const cid = CID.parse(key);
    blockQueue[i++] = [key, cid];
  }

  const carChunks: Uint8Array[] = [];

  const collect = (async () => {
    let blockIndex = 0;

    for await (const chunk of out) {
      carChunks.push(chunk);

      // Record offset for the next unwritten CID in blockQueue
      while (blockIndex < blockQueue.length) {
        const [cidStr, cid] = blockQueue[blockIndex];
        if (!writtenBlocks.has(cidStr)) {
          writtenBlocks.add(cidStr);

          indexEntries[blockIndex] = {
            multihash: cid.multihash.bytes,
            offset,
          };

          blockIndex++;
          break;
        }
        blockIndex++;
      }

      offset += chunk.length;
    }
  })();

  for (const [cidStr, bytes] of nodes.entries()) {
    const cid = CID.parse(cidStr);
    await writer.put({ cid, bytes });
  }

  await writer.close();
  await collect;

  // Calculate total size and merge carChunks efficiently
  const totalLength = carChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const carBytes = new Uint8Array(totalLength);

  let position = 0;
  for (const chunk of carChunks) {
    carBytes.set(chunk, position);
    position += chunk.length;
  }

  return {
    carBytes: u8aConcat(...carChunks),
    indexEntries,
  };
}

export function buildMultihashIndexSorted(
  entries: { multihash: Uint8Array; offset: number }[],
): Uint8Array {
  if (entries.length === 0) {
    throw new Error("Cannot build index from 0 entries.");
  }

  // Sort entries by multihash bytes
  entries.sort((a, b) => u8aCmp(a.multihash, b.multihash));

  const parts: Uint8Array[] = [];

  parts.push(indexHeader(entries.length));

  for (const { multihash, offset } of entries) {
    const digest = multihash.slice(2); // strip 2-byte prefix
    if (digest.length !== 32) throw new Error(`Unexpected digest length: ${digest.length}`);

    const offsetBytes = numberToU64LE(offset);
    const entry = new Uint8Array(40);
    entry.set(digest, 0);
    entry.set(offsetBytes, 32);
    parts.push(entry);
  }

  return u8aConcat(...parts);
}

export function indexHeader(entriesCount: number): Uint8Array {
  return u8aConcat(
    encode(MULTIHASH_INDEX_SORTED_CODE), // multicodec varint
    numberToU32LE(0x01), // digest bucket length
    numberToU64LE(SHA_256_CODE), // multihash code
    numberToU32LE(entriesCount), // entries amount
    numberToU32LE(0x28), // digest + offset length
    numberToU64LE(0x28 * entriesCount), // total length ((digest + offset) * entries)
  );
}
