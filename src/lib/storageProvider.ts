export interface StorageProviderInfo {
  accountId: string;
  peerId: string;
  sectorSize: string;
  windowPostPartitionSectors: string;
  windowPostProofType: string;
}

export function isStorageProviderInfo(obj: object): obj is StorageProviderInfo {
  return (
    "peerId" in obj &&
    "sectorSize" in obj &&
    "windowPostPartitionSectors" in obj &&
    "windowPostProofType" in obj
  );
}
