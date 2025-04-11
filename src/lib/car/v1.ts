import { CarWriter } from "@ipld/car";
import { CID } from "multiformats/cid";
import { chunkFile } from "./chunker";
import { buildBalancedTree } from "./tree";

export async function generateCar(bytes: Uint8Array): Promise<Uint8Array> {
  const leafChunks = await chunkFile(bytes);
  const { allNodes, rootCID } = await buildBalancedTree(leafChunks);
  const carBytes = await writeCarFile(allNodes, rootCID);

  console.log(`CARv1 built with ${leafChunks.length} chunks and ${allNodes.size} total nodes`);
  console.log("Root CID:", rootCID.toString());

  return carBytes;
}

/// Streams the final CARv1 output
async function writeCarFile(nodes: Map<string, Uint8Array>, rootCID: CID): Promise<Uint8Array> {
  const { writer, out } = await CarWriter.create([rootCID]);
  const carChunks: Uint8Array[] = [];

  const collect = (async () => {
    for await (const chunk of out) {
      carChunks.push(chunk);
    }
  })();

  // Write all nodes to the CAR file
  const entries = Array.from(nodes.entries());
  for (let i = 0; i < entries.length; i++) {
    const [cidStr, bytes] = entries[i];
    const cid = CID.parse(cidStr);
    await writer.put({ cid, bytes });
  }

  await writer.close();
  await collect;

  // Combine all CAR chunks
  const totalSize = carChunks.reduce((sum, c) => sum + c.length, 0);
  const carBytes = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of carChunks) {
    carBytes.set(chunk, offset);
    offset += chunk.length;
  }

  return carBytes;
}
