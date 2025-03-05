import { DEFAULT_LOCAL_RPC_ADDRESS } from "./consts";
import type { Rpc, SignedRpc } from "./dealProposal";

type Either<L, R> = L | R;
type RpcResult<T> = Either<T, Error>;

// Helper function for JSON-RPC calls
async function callJsonRpc<R>(url: string, params: object[], method: string): Promise<RpcResult<R>> {
  // Check if method already has v0_ prefix to avoid double prefixing
  const prefixedMethod = method.startsWith("v0_") ? method : `v0_${method}`;

  const request = {
    jsonrpc: "2.0",
    id: 1,
    method: prefixedMethod,
    params,
  };

  console.log("RPC Request:", {
    url: `http://${url}/rpc`,
    method: request.method,
    params: JSON.stringify(params, null, 2),
  });

  const response = await fetch(`http://${url}/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  const jsonResponse = await response.json();
  if ("error" in jsonResponse) {
    return new Error(jsonResponse.error.message);
  }
  if ("result" in jsonResponse) {
    return jsonResponse.result;
  }
  // This error is unchecked on purpose!
  throw new Error(`unknown RPC response format: ${jsonResponse}`);
}

export async function callProposeDeal(
  deal: Rpc,
  address: { ip: string; port?: number } = DEFAULT_LOCAL_RPC_ADDRESS,
): Promise<RpcResult<string>> {
  if (!address.port) {
    address.port = 8001;
  }
  return await callJsonRpc(`${address.ip}:${address.port}`, [deal], "propose_deal");
}

export async function callPublishDeal(
  signed: SignedRpc,
  address: { ip: string; port?: number } = DEFAULT_LOCAL_RPC_ADDRESS,
): Promise<RpcResult<0>> {
  if (!address.port) {
    address.port = 8001;
  }
  return await callJsonRpc(`${address.ip}:${address.port}`, [signed], "publish_deal");
}
