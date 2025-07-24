import { type Multiaddr, multiaddr } from "@multiformats/multiaddr";
import { fileTypeFromBuffer } from "file-type";
import { CID } from "multiformats";
import type { PolkaStorageApi } from "../GlobalCtx";
import type { Deal } from "./deals";

export async function downloadDeal(api: PolkaStorageApi | null, deal: Deal) {
  if (!api) throw new Error("API not ready");

  // look up provider addr
  const maddr = await getProviderMultiaddr(api, deal.value.provider);
  const { address, port } = maddr.nodeAddress();

  // fetch the raw piece
  const pieceCid = CID.decode(deal.value.piece_cid.asBytes()).toString();
  const res = await fetch(`http://${address}:${port}/api/v0/download/${pieceCid}`);
  if (!res.ok) throw new Error(res.statusText);
  const blob = await res.blob();

  // sniff the bytes for a magic number
  const buffer = await blob.arrayBuffer();
  const uint8 = new Uint8Array(buffer);
  const ft = await fileTypeFromBuffer(uint8);
  // fallback to nothing if unknown
  const ext = ft?.ext ?? "";
  const mime = ft?.mime ?? blob.type;

  // re‑wrap in a Blob with the correct mime
  const finalBlob = new Blob([uint8], { type: mime });

  // trigger download with the right extension
  ext === ""
    ? createDownloadTrigger(`${pieceCid}`, finalBlob)
    : createDownloadTrigger(`${pieceCid}.${ext}`, finalBlob);
}

export function createDownloadTrigger(title: string, blob: Blob) {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a temporary anchor element to trigger download
  const a = document.createElement("a");
  a.href = url;
  // Name of the file
  a.download = title;
  document.body.appendChild(a);
  a.click();

  // Clean up
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

async function getProviderMultiaddr(api: PolkaStorageApi, provider: string): Promise<Multiaddr> {
  const providerInfo = await api.query.StorageProvider.StorageProviders.getValue(provider);
  if (!providerInfo) throw new Error(`Provider info for ${provider} not found on-chain`);
  return multiaddr(providerInfo.info.multiaddr.asBytes());
}
