import { HttpProvider } from "@polkadot/api";
import { DEFAULT_LOCAL_RPC_ADDRESS } from "./consts";
import type { RpcFields, SignedRpcFields } from "./dealProposal";

export async function callProposeDeal(
  deal: RpcFields,
  address: { ip: string; port?: number } = DEFAULT_LOCAL_RPC_ADDRESS,
): Promise<string> {
  if (!address.port) {
    address.port = DEFAULT_LOCAL_RPC_ADDRESS.port;
  }
  const provider = new HttpProvider(`http://${address.ip}:${address.port}`);
  return await provider.send("v0_propose_deal", [deal]);
}

export async function callPublishDeal(
  signed: SignedRpcFields,
  address: { ip: string; port?: number } = DEFAULT_LOCAL_RPC_ADDRESS,
): Promise<0> {
  if (!address.port) {
    address.port = DEFAULT_LOCAL_RPC_ADDRESS.port;
  }
  const provider = new HttpProvider(`http://${address.ip}:${address.port}`);
  return await provider.send("v0_published_deal", [signed]);
}
