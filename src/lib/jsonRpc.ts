import { HttpProvider } from "@polkadot/api";
import { DEFAULT_LOCAL_RPC_ADDRESS } from "./consts";
import type { RpcFields, SignedRpcFields } from "./dealProposal";

export type RpcAddress = {
  ip: string;
  port?: number;
};

export async function callProposeDeal(
  deal: RpcFields,
  address: RpcAddress = DEFAULT_LOCAL_RPC_ADDRESS,
  secure_addr: string | undefined = undefined,
): Promise<string> {
  if (!address.port) {
    address.port = DEFAULT_LOCAL_RPC_ADDRESS.port;
  }
  const provider = new HttpProvider(
    secure_addr ? secure_addr : `http://${address.ip}:${address.port}`,
  );
  return await provider.send("v0_propose_deal", [deal]);
}

export async function callPublishDeal(
  signed: SignedRpcFields,
  address: RpcAddress = DEFAULT_LOCAL_RPC_ADDRESS,
  secure_addr: string | undefined = undefined,
): Promise<number> {
  if (!address.port) {
    address.port = DEFAULT_LOCAL_RPC_ADDRESS.port;
  }
  const provider = new HttpProvider(
    secure_addr ? secure_addr : `http://${address.ip}:${address.port}`,
  );
  return await provider.send("v0_publish_deal", [signed]);
}
