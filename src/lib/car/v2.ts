import { u8aConcat } from "@polkadot/util";
import { numberToU64LE } from "./bytes";
import { chunkFile } from "./chunker";
import { CARV2_HEADER_SIZE, PRAGMA_SIZE } from "./consts";
import { buildMultihashIndexSorted, writeCarFileWithOffsets } from "./index";
import { buildBalancedTree } from "./tree";

/**
 * Generates a CARv2 file from a raw file buffer.
 * Internally builds a UnixFS DAG, writes a CARv1 archive, and appends a multihash index.
 *
 * @param bytes - The raw file contents.
 * @returns A Uint8Array representing a valid CARv2 file.
 */
export async function generateCar(bytes: Uint8Array): Promise<Uint8Array> {
  const leafChunks = await chunkFile(bytes);
  const { allNodes, rootCID } = await buildBalancedTree(leafChunks);
  const { carBytes: carV1Bytes, indexEntries } = await writeCarFileWithOffsets(allNodes, rootCID);

  const dataOffset = PRAGMA_SIZE + CARV2_HEADER_SIZE;
  const dataSize = carV1Bytes.length;
  const indexOffset = dataOffset + dataSize;

  const indexBytes = buildMultihashIndexSorted(indexEntries);

  const header = u8aConcat(
    CARv2Pragma,
    characteristics(),
    numberToU64LE(dataOffset),
    numberToU64LE(dataSize),
    numberToU64LE(indexOffset),
  );

  console.log("Root CID:", rootCID.toString());

  return u8aConcat(header, carV1Bytes, indexBytes);
}

/**
 * The CBOR-encoded CARv2 pragma block.
 * Encodes `{ "version": 2 }` using DAG-CBOR.
 *
 * Breakdown of the bytes:
 *
 * 0x0a        -> CBOR tag(10) -> Indicates a self-describing CBOR tag (DAG-CBOR requirement)
 * 0xa1        -> map(1)       -> A map with 1 key-value pair
 * 0x67        -> string(7)    -> The next 7 bytes are a UTF-8 string (the key: "version")
 * 0x76 0x65 0x72 0x73 0x69 0x6f 0x6e
 *             -> "v"  "e"  "r"  "s"  "i"  "o"  "n" -> the string "version"
 * 0x02        -> uint(2)      -> The value 2 (unsigned integer)
 */
const CARv2Pragma = Uint8Array.from([
  0x0a, // CBOR tag(10): self-describing CBOR (required for DAG-CBOR)
  0xa1, // map(1): 1 key-value pair
  0x67, // string(7): next 7 bytes form a string
  0x76, // "v"
  0x65, // "e"
  0x72, // "r"
  0x73, // "s"
  0x69, // "i"
  0x6f, // "o"
  0x6e, // "n"
  0x02, // uint(2): value = 2
]);

/**
 * The 16-byte "characteristics" field for CARv2.
 * Currently unused; set to 16 zeroed bytes.
 */
function characteristics(): Uint8Array {
  return u8aConcat(numberToU64LE(0), numberToU64LE(0));
}
