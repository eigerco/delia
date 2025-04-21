import { type Multiaddr, multiaddr } from "@multiformats/multiaddr";
import type { ApiPromise, WsProvider } from "@polkadot/api";
import { queryPeerId } from "./p2p/bootstrapRequestResponse";

export type Collator = {
  wsProvider: WsProvider;
  apiPromise: ApiPromise;
};

export async function resolvePeerIdMultiaddrs(
  collator: Collator,
  peerId: string,
): Promise<Multiaddr[]> {
  const collatorMaddrs: string[] = await collator.wsProvider.send(
    "polkaStorage_getP2pMultiaddrs",
    [],
  );
  const wsMaddrs = collatorMaddrs
    .filter((maddr) => maddr.includes("ws"))
    .map(multiaddr)
    .at(0);
  if (!wsMaddrs) {
    throw new Error("Could not find the services required to resolve the peer id");
  }
  console.log(`wsMaddrs: ${wsMaddrs.toString()}`);

  // Hack: since there's no way to replace parts of multiaddrs, we need to do it by hand
  // we convert to a string, replace the "0.0.0.0" which is what we're expecting and recreate the multiaddr
  const queryAddr = multiaddr(
    wsMaddrs
      .toString()
      // biome-ignore lint/style/noNonNullAssertion: wsAddress should be valid at this point
      .replace("0.0.0.0", URL.parse(collator.wsProvider.endpoint)!.hostname), // double check this
  );
  console.log(`queryAddr: ${queryAddr.toString()}`);

  const peerIdMultiaddress = await queryPeerId(peerId, queryAddr);
  if (!peerIdMultiaddress) {
    throw new Error(`Failed to find multiaddress for PeerId: ${peerId}`);
  }
  console.log(`peerIdMultiaddress: ${peerIdMultiaddress.map((m) => m.toString())}`);
  return peerIdMultiaddress;
}
