import { DEFAULT_LOCAL_STORAGE_ADDRESS } from "./consts";
import type { RpcFields } from "./dealProposal";

export async function uploadFile(
  file: File,
  dealCid: string,
  address: { ip: string; port?: number } = DEFAULT_LOCAL_STORAGE_ADDRESS,
  secure_addr: string | undefined = undefined,
) {
  if (!address.port) {
    address.port = DEFAULT_LOCAL_STORAGE_ADDRESS.port;
  }

  const body = new FormData();
  body.append("file", file);

  const addr = secure_addr ? secure_addr : `http://${address.ip}:${address.port}`;

  return await fetch(`${addr}/upload/${dealCid}`, {
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
