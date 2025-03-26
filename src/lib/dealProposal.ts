import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import type { TypeRegistry } from "@polkadot/types";
import { stringToU8a, u8aToHex } from "@polkadot/util";
import { CID } from "multiformats";
import { type SignatureWrapper, signRaw } from "./sign";

function encodeCid(cid: CID): string {
  return u8aToHex(cid.bytes);
}

function encodeLabel(label: string): string {
  return u8aToHex(stringToU8a(label));
}

export type InputFields = {
  pieceCid: string;
  pieceSize: string;
  client: string | null; // AccountId32
  label: string;
  startBlock: string;
  endBlock: string;
  storagePricePerBlock: string;
  providerCollateral: string;
};

// Default values — based on Spaceglenda
export const DEFAULT_INPUT: InputFields = {
  pieceCid: "baga6ea4seaqmif7wqwq23pg2megbycbuxav4x4yw7fqfbxcihduqsupciaguspq",
  pieceSize: "1048576",
  client: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  label: "Spaceglenda!",
  startBlock: "100",
  endBlock: "150",
  storagePricePerBlock: "1000",
  providerCollateral: "100",
};

// Validation function
export const validateInput = (input: InputFields): ValidatedFields | null => {
  try {
    const pieceCid = CID.parse(input.pieceCid);
    if (!pieceCid || !input.client) return null;

    return {
      pieceCid,
      pieceSize: Number.parseInt(input.pieceSize, 10),
      client: input.client,
      label: input.label,
      startBlock: Number.parseInt(input.startBlock, 10),
      endBlock: Number.parseInt(input.endBlock, 10),
      storagePricePerBlock: Number.parseInt(input.storagePricePerBlock, 10),
      providerCollateral: Number.parseInt(input.providerCollateral, 10),
    };
  } catch {
    return null;
  }
};

// Convert validated data to RPC format
export const toRpc = (validated: ValidatedFields, provider: string): RpcFields => ({
  piece_cid: validated.pieceCid.toString(),
  piece_size: validated.pieceSize,
  client: validated.client,
  provider,
  label: validated.label,
  start_block: validated.startBlock,
  end_block: validated.endBlock,
  storage_price_per_block: validated.storagePricePerBlock,
  provider_collateral: validated.providerCollateral,
  state: "Published",
});

// Convert validated data to SCALEable format
export const toSCALEable = (validated: ValidatedFields, provider: string): SCALEableFields => ({
  piece_cid: encodeCid(validated.pieceCid),
  piece_size: validated.pieceSize,
  client: validated.client,
  provider,
  label: encodeLabel(validated.label),
  start_block: validated.startBlock,
  end_block: validated.endBlock,
  storage_price_per_block: validated.storagePricePerBlock,
  provider_collateral: validated.providerCollateral,
  deal_state: { Published: null },
});

// Encode SCALEable data
export const encodeSCALEable = (
  scaleableData: SCALEableFields,
  registry: TypeRegistry,
): Uint8Array => {
  return registry.createType("DealProposal", scaleableData).toU8a();
};

export const createSignedRpc = async (
  validated: ValidatedFields,
  provider: string,
  registry: TypeRegistry,
  account: InjectedAccountWithMeta,
): Promise<SignedRpcFields> => {
  const rpc = toRpc(validated, provider);
  const scaleable = toSCALEable(validated, provider);
  const scale = encodeSCALEable(scaleable, registry);
  const signed = await signRaw(account, u8aToHex(scale));

  return {
    client_signature: signed,
    deal_proposal: rpc,
  };
};

export type ValidatedFields = {
  pieceCid: CID;
  pieceSize: number;
  client: string;
  label: string;
  startBlock: number;
  endBlock: number;
  storagePricePerBlock: number;
  providerCollateral: number;
};

export type RpcFields = {
  piece_cid: string;
  piece_size: number;
  client: string;
  provider: string;
  label: string;
  start_block: number;
  end_block: number;
  storage_price_per_block: number;
  provider_collateral: number;
  state: "Published";
};

export type SignedRpcFields = {
  client_signature: SignatureWrapper;
  deal_proposal: RpcFields;
};

export type SCALEableFields = {
  piece_cid: string;
  piece_size: number;
  client: string;
  provider: string;
  label: string;
  start_block: number;
  end_block: number;
  storage_price_per_block: number;
  provider_collateral: number;
  deal_state: { Published: null };
};
