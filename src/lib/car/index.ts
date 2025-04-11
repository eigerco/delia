import { CarBufferWriter, CarWriter } from "@ipld/car";
import { CID } from "multiformats/cid";
import { encode } from "uint8-varint";
import { compareUint8Arrays, concatUint8Arrays, numberToU32LE, numberToU64LE } from "./bytes";
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
  const carChunks: Uint8Array[] = [];
  const indexEntries: IndexEntry[] = [];

  const blockQueue: [string, CID][] = Array.from(nodes.keys()).map((cidStr) => {
    const cid = CID.parse(cidStr);
    return [cidStr, cid];
  });

  const writtenBlocks = new Set<string>();

  const collect = (async () => {
    for await (const chunk of out) {
      carChunks.push(chunk);

      // Attempt to match written block by order
      for (const [cidStr, cid] of blockQueue) {
        if (!writtenBlocks.has(cidStr)) {
          writtenBlocks.add(cidStr);

          indexEntries.push({
            multihash: cid.multihash.bytes,
            offset,
          });

          blockQueue.shift();
          break;
        }
      }

      offset += chunk.length;
    }
  })();

  for (const [cidStr, bytes] of Array.from(nodes.entries())) {
    const cid = CID.parse(cidStr);
    await writer.put({ cid, bytes });
  }

  await writer.close();
  await collect;

  return {
    carBytes: concatUint8Arrays(carChunks),
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
  entries.sort((a, b) => compareUint8Arrays(a.multihash, b.multihash));

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

  return concatUint8Arrays(parts);
}

export function indexHeader(entriesCount: number): Uint8Array {
  return concatUint8Arrays([
    encode(MULTIHASH_INDEX_SORTED_CODE), // multicodec varint
    numberToU32LE(0x01), // digest bucket length
    numberToU64LE(SHA_256_CODE), // multihash code
    numberToU32LE(entriesCount), // entries amount
    numberToU32LE(0x28), // digest + offset length
    numberToU64LE(0x28 * entriesCount), // total length ((digest + offset) * entries)
  ]);
}
