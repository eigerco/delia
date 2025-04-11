import { type Multiaddr, multiaddr } from "@multiformats/multiaddr";
import { cborStream } from "it-cbor-stream";
import { createNode } from ".";

const BOOTSTRAP_DEFAULT_MULTIADDR = multiaddr("/ip4/127.0.0.1/tcp/62650/ws");
const BOOTSTRAP_REQUEST_RESPONSE_PROTOCOL = "/polka-storage-bootstrap-req-resp/1.0.0";

export async function queryPeerId(
  peerId: string,
  remote: Multiaddr = BOOTSTRAP_DEFAULT_MULTIADDR,
): Promise<Multiaddr[] | null> {
  const local = await createNode();
  const connection = await local.dialProtocol(remote, BOOTSTRAP_REQUEST_RESPONSE_PROTOCOL);
  const cbor = cborStream(connection);
  await cbor.write(peerId);
  const response: object = await cbor.read();

  if (isFound(response)) {
    const maddrs = [];
    for (const multiaddress of response.Found.multiaddrs) {
      const maddr = multiaddr(multiaddress);
      if (maddr.protoNames().includes("ws")) {
        maddrs.push(maddr);
      }
    }
    console.log(maddrs);
    // NOTE: assumes that the addresses are dialable
    return maddrs;
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
