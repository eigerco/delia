import { type Multiaddr, multiaddr } from "@multiformats/multiaddr";
import type { WsProvider } from "@polkadot/api";
import { queryPeerId } from "./p2p/bootstrapRequestResponse";

export async function resolvePeerIdMultiaddrs(
  collator: WsProvider,
  peerId: string,
): Promise<Multiaddr[]> {
  const collatorMaddrs: string[] = await collator.send("polkaStorage_getP2pMultiaddrs", []);
  // To be explicit: if it includes ws, it includes wss
  const wsMaddrs = collatorMaddrs.filter((maddr) => maddr.includes("ws")).map(multiaddr);
  if (wsMaddrs.length === 0) {
    throw new Error("Could not find the services required to resolve the peer id");
  }

  // Lambda here would make it more performant but remember KISS
  const wssMultiaddr = wsMaddrs.find((maddr) => maddr.protoNames().includes("wss"));
  const wsMultiaddr = wsMaddrs.find((maddr) => maddr.protoNames().includes("ws"));
  const finalMultiaddr = wssMultiaddr || wsMultiaddr;
  if (!finalMultiaddr) {
    throw new Error("Could not find the services required to resolve the peer id");
  }
  console.log(`WebSocket Multiaddress: ${finalMultiaddr.toString()}`);

  // Hack: since there's no way to replace parts of multiaddrs, we need to do it by hand
  // we convert to a string, replace the "0.0.0.0" which is what we're expecting and recreate the multiaddr
  const queryAddr = multiaddr(
    finalMultiaddr
      .toString()
      // biome-ignore lint/style/noNonNullAssertion: wsAddress should be valid at this point
      .replace("0.0.0.0", URL.parse(collator.endpoint)!.hostname), // double check this
  );
  console.log(`queryAddr: ${queryAddr.toString()}`);

  const peerIdMultiaddress = await queryPeerId(peerId, queryAddr);
  if (!peerIdMultiaddress) {
    throw new Error(`Failed to find multiaddress for PeerId: ${peerId}`);
  }
  console.log(`peerIdMultiaddress: ${peerIdMultiaddress.map((m) => m.toString())}`);
  return peerIdMultiaddress;
}
