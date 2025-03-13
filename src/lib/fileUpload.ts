import { DEFAULT_LOCAL_STORAGE_ADDRESS } from "./consts";

export async function uploadFile(
  file: File,
  dealCid: string,
  address: { ip: string; port?: number } = DEFAULT_LOCAL_STORAGE_ADDRESS,
) {
  if (!address.port) {
    address.port = 8001;
  }

  const body = new FormData();
  body.append("file", file);

  return await fetch(`http://${address.ip}:${address.port}/upload/${dealCid}`, {
    method: "PUT",
    body,
  });
}
