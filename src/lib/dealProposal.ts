import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import type { TypeRegistry } from "@polkadot/types";
import { stringToU8a, u8aToHex } from "@polkadot/util";
import { CID } from "multiformats";
import type { FormValues } from "../components/deal-proposal-form/types";
import { type SignatureWrapper, signRaw } from "./sign";

function encodeCid(cid: CID): string {
  return u8aToHex(cid.bytes);
}

function encodeLabel(label: string): string {
  return u8aToHex(stringToU8a(label));
}

// Convert validated data to RPC format
export const toRpc = (
  validated: FormValues,
  provider: string,
  pricePerBlock: number,
  startBlock: number,
  endBlock: number,
): RpcFields => ({
  piece_cid: validated.piece.pieceCid,
  piece_size: validated.piece.size,
  client: validated.client,
  provider,
  label: validated.label,
  start_block: startBlock,
  end_block: endBlock,
  storage_price_per_block: pricePerBlock,
  state: "Published",
});

// Convert validated data to SCALEable format
export const toSCALEable = (
  validated: FormValues,
  provider: string,
  pricePerBlock: number,
  startBlock: number,
  endBlock: number,
): SCALEableFields => ({
  piece_cid: encodeCid(CID.parse(validated.piece.pieceCid)),
  piece_size: validated.piece.size,
  client: validated.client,
  provider,
  label: encodeLabel(validated.label),
  start_block: startBlock,
  end_block: endBlock,
  storage_price_per_block: pricePerBlock,
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
  validated: FormValues,
  provider: string,
  pricePerBlock: number,
  startBlock: number,
  endBlock: number,
  registry: TypeRegistry,
  account: InjectedAccountWithMeta,
): Promise<SignedRpcFields> => {
  const rpc = toRpc(validated, provider, pricePerBlock, startBlock, endBlock);
  const scaleable = toSCALEable(validated, provider, pricePerBlock, startBlock, endBlock);
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
  deal_state: { Published: null };
};
