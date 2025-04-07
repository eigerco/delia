import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { webSockets } from "@libp2p/websockets";
import { type Multiaddr, multiaddr } from "@multiformats/multiaddr";
import { cborStream } from "it-cbor-stream";
import { type Libp2p, createLibp2p } from "libp2p";
import {resolvePeerId, setupLogging} from "delia-rr";
import { identify } from "@libp2p/identify";

const BOOTSTRAP_DEFAULT_MULTIADDR = multiaddr("/ip4/127.0.0.1/tcp/62650/ws");
const BOOTSTRAP_REQUEST_RESPONSE_PROTOCOL = "/polka-storage-bootstrap-req-resp/1.0.0";

async function createNode(): Promise<Libp2p> {
  return await createLibp2p({
    addresses: {},
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    transports: [webSockets()],
    services: {
      identify: identify()
    },
    connectionMonitor: {
      enabled: false
    }
  });
}

export async function queryPeerId(
  peerId: string,
  remote: Multiaddr = BOOTSTRAP_DEFAULT_MULTIADDR,
): Promise<Multiaddr | null> {
  debugger;
  /*
    try {
    console.log(await resolvePeerId([remote.toString()], peerId))
  } catch (err) {
    console.log(err)
  }
    */

  const local = await createNode();
  console.log(local.peerId.toString())
  const connection = await local.dialProtocol(remote, "/polka-storage/rr/resolve-peer-id/1.0.0");
  const cbor = cborStream(connection);
  await cbor.write({peer: peerId});
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
