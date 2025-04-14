import * as dagPB from "@ipld/dag-pb";
import { UnixFS } from "ipfs-unixfs";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import type { Chunk } from "./chunker";
import { MAX_LINKS } from "./consts";

/**
 * Represents metadata about a DAG node link, used to build intermediate and root nodes.
 */
interface LinkInfo {
  cid: CID;
  size: number;
  encodedSize: number;
}

/**
 * Builds a balanced DAG-PB/UnixFS tree from a set of leaf chunks, following the IPLD UnixFS spec.
 * Returns a map of all nodes (leaves and intermediates) and the CID of the root node.
 *
 * @param leafChunks - The leaf chunks representing file data blocks.
 * @returns An object containing all nodes (CID -> encoded bytes) and the root CID.
 */
export async function buildBalancedTree(
  leafChunks: Chunk[],
): Promise<{ allNodes: Map<string, Uint8Array>; rootCID: CID }> {
  const allNodes = new Map<string, Uint8Array>();

  // Store leaf chunks in the node map
  for (const chunk of leafChunks) {
    allNodes.set(chunk.cid.toString(), chunk.bytes);
  }

  // If there's only one chunk, it becomes the root
  if (leafChunks.length === 1) {
    return { allNodes, rootCID: leafChunks[0].cid };
  }

  // Build initial LinkInfo array from leaf chunks
  let currentLevel = buildInitialLinkInfo(leafChunks);

  // Iteratively group and build higher levels until root is formed
  while (currentLevel.length > 1) {
    const nextLevel: LinkInfo[] = [];

    const groups = groupLinks(currentLevel, MAX_LINKS);
    for (const group of groups) {
      const { nodeCID, nodeBytes, nodeInfo } = await createStemNode(group);
      allNodes.set(nodeCID.toString(), nodeBytes);
      nextLevel.push(nodeInfo);
    }

    currentLevel = nextLevel;
  }

  return { allNodes, rootCID: currentLevel[0].cid };
}

/**
 * Converts an array of leaf chunks into initial LinkInfo metadata for tree construction.
 *
 * @param chunks - The leaf chunks.
 * @returns An array of LinkInfo objects.
 */
function buildInitialLinkInfo(chunks: Chunk[]): LinkInfo[] {
  return chunks.map((chunk) => ({
    cid: chunk.cid,
    size: chunk.size,
    encodedSize: chunk.bytes.length,
  }));
}

/**
 * Splits an array of links into smaller groups of a fixed size.
 *
 * @param links - The array of LinkInfo to group.
 * @param groupSize - Maximum number of links per group.
 * @returns An array of grouped LinkInfo arrays.
 */
function groupLinks(links: LinkInfo[], groupSize: number): LinkInfo[][] {
  const groups: LinkInfo[][] = [];
  for (let i = 0; i < links.length; i += groupSize) {
    groups.push(links.slice(i, i + groupSize));
  }
  return groups;
}

/**
 * Creates an intermediate or root node from a group of links.
 * Returns its CID, encoded bytes, and metadata for the next tree level.
 *
 * @param links - The child links for this node.
 * @returns An object containing the new node's CID, bytes, and LinkInfo.
 */
async function createStemNode(links: LinkInfo[]): Promise<{
  nodeCID: CID;
  nodeBytes: Uint8Array;
  nodeInfo: LinkInfo;
}> {
  const nodeBytes = createUnixFsNodeFromLinks(links);
  const hash = await sha256.digest(nodeBytes);
  const nodeCID = CID.create(1, dagPB.code, hash);

  const totalSize = links.reduce((sum, link) => sum + link.size, 0);
  const totalEncodedSize = links.reduce((sum, link) => sum + link.encodedSize, 0);

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

/**
 * Creates and encodes a UnixFS DAG-PB node from a group of links.
 *
 * @param links - The list of LinkInfo objects to include in the node.
 * @returns The encoded DAG-PB bytes of the node.
 */
function createUnixFsNodeFromLinks(links: LinkInfo[]): Uint8Array {
  const unixfs = new UnixFS({ type: "file" });

  for (const link of links) {
    unixfs.addBlockSize(BigInt(link.size));
  }

  const dagLinks = links.map((link) => dagPB.createLink("", link.encodedSize, link.cid));

  const dagNode = dagPB.createNode(unixfs.marshal(), dagLinks);
  return dagPB.encode(dagNode);
}
