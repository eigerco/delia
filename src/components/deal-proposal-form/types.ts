export interface Piece {
  pieceCid: string;
  payloadCid: string;
  size: number;
  file: File;
}

export interface IFormValues {
  piece: Piece;
  label: string;
  startBlock: number;
  endBlock: number;
  pricePerBlock: number;
  providerCollateral: number;
  client: string;
}
