import { HttpProvider, WsProvider } from "@polkadot/api";
import { DEFAULT_LOCAL_RPC_ADDRESS } from "./consts";
import type { RpcFields, SignedRpcFields } from "./dealProposal";

export type RpcAddress = {
  ip: string;
  port?: number;
};

export namespace StorageProviderRpc {
  export async function callProposeDeal(
    deal: RpcFields,
    address: RpcAddress = DEFAULT_LOCAL_RPC_ADDRESS,
  ): Promise<string> {
    if (!address.port) {
      address.port = DEFAULT_LOCAL_RPC_ADDRESS.port;
    }
    const provider = new HttpProvider(`http://${address.ip}:${address.port}`);
    return await provider.send("v0_propose_deal", [deal]);
  }

  export async function callPublishDeal(
    signed: SignedRpcFields,
    address: RpcAddress = DEFAULT_LOCAL_RPC_ADDRESS,
  ): Promise<0> {
    if (!address.port) {
      address.port = DEFAULT_LOCAL_RPC_ADDRESS.port;
    }
    const provider = new HttpProvider(`http://${address.ip}:${address.port}`);
    return await provider.send("v0_publish_deal", [signed]);
  }
}

export namespace PolkaCollatorRpc {
  export async function getP2PMultiaddrs(address: string): Promise<string[]> {
    const provider = await new WsProvider(address).isReady;
    return await provider.send("polkaStorage_getP2pMultiaddrs", []);
  }
}
