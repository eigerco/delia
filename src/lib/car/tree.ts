import * as dagPB from "@ipld/dag-pb";
import { UnixFS } from "ipfs-unixfs";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import type { Chunk } from "./chunker";
import { MAX_LINKS } from "./consts";

interface LinkInfo {
  cid: CID;
  size: number;
  encodedSize: number;
}

/// Build a balanced tree from leaf chunks
export async function buildBalancedTree(
  leafChunks: Chunk[],
): Promise<{ allNodes: Map<string, Uint8Array>; rootCID: CID }> {
  // Map to store all nodes (both leaf chunks and intermediate nodes)
  const allNodes = new Map<string, Uint8Array>();

  // Add all leaf chunks to the nodes map
  for (const chunk of leafChunks) {
    allNodes.set(chunk.cid.toString(), chunk.bytes);
  }

  // Single chunk case - return the chunk's CID as root
  if (leafChunks.length === 1) {
    return { allNodes, rootCID: leafChunks[0].cid };
  }

  // Initial leaf level links
  let currentLevel: LinkInfo[] = leafChunks.map((chunk) => ({
    cid: chunk.cid,
    size: chunk.size,
    encodedSize: chunk.bytes.length,
  }));

  // Build the tree level by level until we have a single root
  while (currentLevel.length > 1) {
    const nextLevel: LinkInfo[] = [];

    // Process the current level in chunks of MAX_LINKS
    for (let i = 0; i < currentLevel.length; i += MAX_LINKS) {
      const levelChunk = currentLevel.slice(i, i + MAX_LINKS);
      const { nodeCID, nodeBytes, nodeInfo } = await createStemNode(levelChunk);

      // Store the node
      allNodes.set(nodeCID.toString(), nodeBytes);
      nextLevel.push(nodeInfo);
    }

    // Move up to the next level
    currentLevel = nextLevel;
  }

  // The last remaining link is the root
  return { allNodes, rootCID: currentLevel[0].cid };
}

/// Create an intermediate or root node from a list of links
async function createStemNode(links: LinkInfo[]): Promise<{
  nodeCID: CID;
  nodeBytes: Uint8Array;
  nodeInfo: LinkInfo;
}> {
  // Calculate total size for UnixFS node
  const totalSize = links.reduce((sum, link) => sum + link.size, 0);
  const totalEncodedSize = links.reduce((sum, link) => sum + link.encodedSize, 0);

  // Create UnixFS data structure
  const unixfs = new UnixFS({
    type: "file",
  });

  // Add block sizes to UnixFS
  for (const link of links) {
    unixfs.addBlockSize(BigInt(link.size));
  }

  // Create DAG-PB links (with empty names as specified in the Rust code)
  const dagLinks = links.map((link) => dagPB.createLink("", link.encodedSize, link.cid));

  // Create the DAG-PB node
  const dagNode = dagPB.createNode(unixfs.marshal(), dagLinks);
  const nodeBytes = dagPB.encode(dagNode);

  // Calculate CID
  const hash = await sha256.digest(nodeBytes);
  const nodeCID = CID.create(1, dagPB.code, hash);

  // Return the node information
  return {
    nodeCID,
    nodeBytes,
    nodeInfo: {
      cid: nodeCID,
      size: totalSize,
      encodedSize: nodeBytes.length + totalEncodedSize,
    },
  };
}
