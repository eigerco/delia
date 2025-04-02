import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { webSockets } from "@libp2p/websockets";
import { type Multiaddr, multiaddr } from "@multiformats/multiaddr";
import { cborStream } from "it-cbor-stream";
import { type Libp2p, createLibp2p } from "libp2p";

const BOOTSTRAP_DEFAULT_MULTIADDR = multiaddr("/ip4/127.0.0.1/tcp/62650/ws");
const BOOTSTRAP_REQUEST_RESPONSE_PROTOCOL = "/polka-storage-bootstrap-req-resp/1.0.0";

async function createNode(): Promise<Libp2p> {
  return await createLibp2p({
    addresses: {},
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    transports: [webSockets()],
  });
}

export async function queryPeerId(
  peerId: string,
  remote: Multiaddr = BOOTSTRAP_DEFAULT_MULTIADDR,
): Promise<Multiaddr | null> {
  const local = await createNode();
  const connection = await local.dialProtocol(remote, BOOTSTRAP_REQUEST_RESPONSE_PROTOCOL);
  const cbor = cborStream(connection);
  await cbor.write(peerId);
  const response: object = await cbor.read();

  if (isFound(response)) {
    // TODO: this assumes a single multiaddress was returned
    return multiaddr(response.Found.multiaddrs[0]);
  }

  if (!isNotFound(response)) {
    console.warn(`unknown format: ${response}`);
  }
  return null;
}

type Found = {
  Found: {
    peer_id: string;
    multiaddrs: Uint8Array[];
  };
};

function isFound(obj: object): obj is Found {
  return (
    "Found" in obj &&
    obj.Found instanceof Object &&
    "peer_id" in obj.Found &&
    "multiaddrs" in obj.Found
  );
}

type NotFound = { NotFound: string };

function isNotFound(obj: object): obj is NotFound {
  return "NotFound" in obj && obj.NotFound instanceof String;
}
