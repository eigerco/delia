import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { webSockets } from "@libp2p/websockets";
import { type Libp2p, createLibp2p } from "libp2p";

export async function createNode(): Promise<Libp2p> {
  return await createLibp2p({
    addresses: {},
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    transports: [webSockets()],
  });
}
