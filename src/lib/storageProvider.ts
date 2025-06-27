import type { Multiaddr } from "@multiformats/multiaddr";

export interface StorageProviderInfo {
  accountId: string;
  multiaddr: Multiaddr;
  sectorSize: string;
  windowPostPartitionSectors: string;
  windowPostProofType: string;
  dealParams: DealParams;
}

export interface DealDuration {
  lower: number;
  upper: number;
}

export interface DealParams {
  minimumPricePerBlock: number;
  dealDuration: DealDuration;
}

export function isStorageProviderInfo(obj: object): obj is StorageProviderInfo {
  return (
    "multiaddr" in obj &&
    "sectorSize" in obj &&
    "windowPostPartitionSectors" in obj &&
    "windowPostProofType" in obj
  );
}
