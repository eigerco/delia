import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import type { TypeRegistry } from "@polkadot/types";
import { stringToU8a, u8aToHex } from "@polkadot/util";
import { CID } from "multiformats";
import type { IFormValues } from "../components/deal-proposal-form/types";
import { type SignatureWrapper, signRaw } from "./sign";

function encodeCid(cid: CID): string {
  return u8aToHex(cid.bytes);
}

function encodeLabel(label: string): string {
  return u8aToHex(stringToU8a(label));
}

// Convert validated data to RPC format
export const toRpc = (
  validated: IFormValues,
  provider: string,
  pricePerBlock: number,
  collateral: number,
): RpcFields => ({
  piece_cid: validated.piece.pieceCid,
  piece_size: validated.piece.size,
  client: validated.client,
  provider,
  label: validated.label,
  start_block: validated.startBlock,
  end_block: validated.endBlock,
  storage_price_per_block: pricePerBlock,
  provider_collateral: collateral,
  state: "Published",
});

// Convert validated data to SCALEable format
export const toSCALEable = (
  validated: IFormValues,
  provider: string,
  pricePerBlock: number,
  collateral: number,
): SCALEableFields => ({
  piece_cid: encodeCid(CID.parse(validated.piece.pieceCid)),
  piece_size: validated.piece.size,
  client: validated.client,
  provider,
  label: encodeLabel(validated.label),
  start_block: validated.startBlock,
  end_block: validated.endBlock,
  storage_price_per_block: pricePerBlock,
  provider_collateral: collateral,
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
  validated: IFormValues,
  provider: string,
  pricePerBlock: number,
  collateral: number,
  registry: TypeRegistry,
  account: InjectedAccountWithMeta,
): Promise<SignedRpcFields> => {
  const rpc = toRpc(validated, provider, pricePerBlock, collateral);
  const scaleable = toSCALEable(validated, provider, pricePerBlock, collateral);
  const scale = encodeSCALEable(scaleable, registry);
  const signed = await signRaw(account, u8aToHex(scale));

  return {
    client_signature: signed,
    deal_proposal: rpc,
  };
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
