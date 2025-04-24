import type { StorageProviderInfo } from "../../lib/storageProvider";

export interface Piece {
  pieceCid: string;
  payloadCid: string;
  size: number;
  file: File;
}

export interface FormValues {
  piece: Piece;
  label: string;
  client: string;
  providers: StorageProviderInfo[];
  duration: {
    months: number;
    days: number;
  };
}
