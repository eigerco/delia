import { u8aConcat } from "@polkadot/util";
import { numberToU64LE } from "./bytes";
import { chunkFile } from "./chunker";
import { CARV2_HEADER_SIZE, PRAGMA_SIZE } from "./consts";
import { buildMultihashIndexSorted, writeCarFileWithOffsets } from "./index";
import { buildBalancedTree } from "./tree";

export async function generateCar(bytes: Uint8Array): Promise<Uint8Array> {
  const leafChunks = await chunkFile(bytes);
  const { allNodes, rootCID } = await buildBalancedTree(leafChunks);
  const { carBytes: carV1Bytes, indexEntries } = await writeCarFileWithOffsets(allNodes, rootCID);

  const dataOffset = PRAGMA_SIZE + CARV2_HEADER_SIZE;
  const dataSize = carV1Bytes.length;
  const indexOffset = dataOffset + dataSize;
  const indexBytes = buildMultihashIndexSorted(indexEntries);

  const header = u8aConcat(
    CARv2Pragma(),
    characteristics(),
    numberToU64LE(dataOffset),
    numberToU64LE(dataSize),
    numberToU64LE(indexOffset),
  );

  console.log("Root CID:", rootCID.toString());

  const carBytes = u8aConcat(header, carV1Bytes, indexBytes);

  return carBytes;
}

function CARv2Pragma(): Uint8Array {
  return Uint8Array.from([
    0x0a, // unit(10)
    0xa1, // map(1)
    0x67, // string(7)
    0x76,
    0x65,
    0x72,
    0x73,
    0x69,
    0x6f,
    0x6e, // "version"
    0x02, // uint(2)
  ]);
}

function characteristics(): Uint8Array {
  return u8aConcat(numberToU64LE(0), numberToU64LE(0));
}
