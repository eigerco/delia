import { DEFAULT_LOCAL_STORAGE_ADDRESS } from "./consts";
import type { RpcFields, SignedRpcFields } from "./dealProposal";

export async function uploadFile(
  file: File,
  dealCid: string,
  address: { ip: string; port?: number } = DEFAULT_LOCAL_STORAGE_ADDRESS,
  secure_addr: string | undefined = undefined,
): Promise<Response> {
  if (!address.port) {
    address.port = DEFAULT_LOCAL_STORAGE_ADDRESS.port;
  }

  const body = new FormData();
  body.append("file", file);

  const addr = secure_addr ? secure_addr : `http://${address.ip}:${address.port}`;

  return await fetch(`${addr}/api/v0/upload/${dealCid}`, {
    method: "PUT",
    body,
  });
}

export async function proposeDeal(
  deal: RpcFields,
  address: { ip: string; port?: number } = DEFAULT_LOCAL_STORAGE_ADDRESS,
  secure_addr?: string,
): Promise<string> {
  if (!address.port) {
    address.port = DEFAULT_LOCAL_STORAGE_ADDRESS.port;
  }

  const addr = secure_addr ? secure_addr : `http://${address.ip}:${address.port}`;
  const response = await fetch(`${addr}/api/v0/propose_deal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(deal),
  });

  if (!response.ok) {
    throw new Error(`Failed to propose deal: ${response.statusText}`);
  }
  return await response.json();
}

export async function publishDeal(
  signed: SignedRpcFields,
  address: { ip: string; port?: number } = DEFAULT_LOCAL_STORAGE_ADDRESS,
  secure_addr?: string,
): Promise<number> {
  if (!address.port) {
    address.port = DEFAULT_LOCAL_STORAGE_ADDRESS.port;
  }

  const addr = secure_addr ? secure_addr : `http://${address.ip}:${address.port}`;
  const response = await fetch(`${addr}/api/v0/publish_deal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signed),
  });

  if (!response.ok) {
    throw new Error(`Failed to propose deal: ${response.statusText}`);
  }
  return await response.json();
}
