import { DEFAULT_LOCAL_STORAGE_ADDRESS } from "./consts";

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
