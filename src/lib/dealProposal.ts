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

type InputKeys =
  | "pieceCid"
  | "pieceSize"
  | "client"
  | "label"
  | "startBlock"
  | "endBlock"
  | "storagePricePerBlock"
  | "providerCollateral";

export class Input {
  pieceCid: string;
  pieceSize: string;
  client: string; // AccountId32
  label: string;
  startBlock: string;
  endBlock: string;
  storagePricePerBlock: string;
  providerCollateral: string;

  constructor(
    pieceCid: string,
    pieceSize: string,
    client: string,
    label: string,
    startBlock: string,
    endBlock: string,
    storagePricePerBlock: string,
    providerCollateral: string,
  ) {
    this.pieceCid = pieceCid;
    this.pieceSize = pieceSize;
    this.client = client;
    this.label = label;
    this.startBlock = startBlock;
    this.endBlock = endBlock;
    this.storagePricePerBlock = storagePricePerBlock;
    this.providerCollateral = providerCollateral;
  }

  static default(): Input {
    return new Input(
      "baga6ea4seaqmif7wqwq23pg2megbycbuxav4x4yw7fqfbxcihduqsupciaguspq",
      "1048576",
      "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      "Spaceglenda!",
      "100",
      "150",
      "1000",
      "100",
    );
  }

  private deepCopy(): Input {
    return new Input(
      this.pieceCid,
      this.pieceSize,
      this.client,
      this.label,
      this.startBlock,
      this.endBlock,
      this.storagePricePerBlock,
      this.providerCollateral,
    );
  }

  copyUpdate(key: InputKeys, value: string): Input {
    const copy: Input = this.deepCopy();
    copy[key] = value;
    return copy;
  }

  validate(): Validated | null {
    try {
      const pieceCid = CID.parse(this.pieceCid);
      if (pieceCid === null) {
        return null;
      }

      return new Validated(
        pieceCid,
        Number.parseInt(this.pieceSize),
        this.client,
        this.label,
        Number.parseInt(this.startBlock),
        Number.parseInt(this.endBlock),
        Number.parseInt(this.storagePricePerBlock),
        Number.parseInt(this.providerCollateral),
      );
    } catch {
      return null;
    }
  }
}

export class Validated {
  readonly pieceCid: CID;
  readonly pieceSize: number;
  readonly client: string;
  readonly label: string;
  readonly startBlock: number;
  readonly endBlock: number;
  readonly storagePricePerBlock: number;
  readonly providerCollateral: number;

  constructor(
    pieceCid: CID,
    pieceSize: number,
    client: string,
    label: string,
    startBlock: number,
    endBlock: number,
    storagePricePerBlock: number,
    providerCollateral: number,
  ) {
    this.pieceCid = pieceCid;
    this.pieceSize = pieceSize;
    this.client = client;
    this.label = label;
    this.startBlock = startBlock;
    this.endBlock = endBlock;
    this.storagePricePerBlock = storagePricePerBlock;
    this.providerCollateral = providerCollateral;
  }

  toRpc(provider: string): Rpc {
    return new Rpc(
      this.pieceCid.toString(),
      this.pieceSize,
      this.client,
      provider,
      this.label,
      this.startBlock,
      this.endBlock,
      this.storagePricePerBlock,
      this.providerCollateral,
    );
  }

  toSCALEable(provider: string): SCALEable {
    return new SCALEable(
      encodeCid(this.pieceCid),
      this.pieceSize,
      this.client,
      provider,
      encodeLabel(this.label),
      this.startBlock,
      this.endBlock,
      this.storagePricePerBlock,
      this.providerCollateral,
    );
  }

  async toSignedRpc(
    provider: string,
    registry: TypeRegistry,
    account: InjectedAccountWithMeta,
  ): Promise<SignedRpc> {
    const rpc = this.toRpc(provider);
    const scale = this.toSCALEable(provider).encode(registry);
    const signed = await signRaw(account, u8aToHex(scale));

    return new SignedRpc(signed, rpc);
  }
}

export class Rpc {
  readonly piece_cid: string;
  readonly piece_size: number;
  readonly client: string; // AccountId32
  readonly provider: string; // AccountId32
  readonly label: string;
  readonly start_block: number;
  readonly end_block: number;
  readonly storage_price_per_block: number;
  readonly provider_collateral: number;
  readonly state: "Published";

  constructor(
    piece_cid: string,
    piece_size: number,
    client: string, // AccountId32
    provider: string, // AccountId32
    label: string,
    start_block: number,
    end_block: number,
    storage_price_per_block: number,
    provider_collateral: number,
  ) {
    this.piece_cid = piece_cid;
    this.piece_size = piece_size;
    this.client = client;
    this.provider = provider;
    this.label = label;
    this.start_block = start_block;
    this.end_block = end_block;
    this.storage_price_per_block = storage_price_per_block;
    this.provider_collateral = provider_collateral;
    this.state = "Published";
  }
}

export class SCALEable {
  piece_cid: string; // Bytes
  piece_size: number;
  client: string; // AccountId32
  provider: string; // AccountId32
  label: string; // Bytes
  start_block: number;
  end_block: number;
  storage_price_per_block: number;
  provider_collateral: number;
  deal_state: { Published: null };

  constructor(
    piece_cid: string, // Bytes
    piece_size: number,
    client: string, // AccountId32
    provider: string, // AccountId32
    label: string, // Bytes
    start_block: number,
    end_block: number,
    storage_price_per_block: number,
    provider_collateral: number,
  ) {
    this.piece_cid = piece_cid;
    this.piece_size = piece_size;
    this.client = client;
    this.provider = provider;
    this.label = label;
    this.start_block = start_block;
    this.end_block = end_block;
    this.storage_price_per_block = storage_price_per_block;
    this.provider_collateral = provider_collateral;
    this.deal_state = { Published: null };
  }

  encode(registry: TypeRegistry): Uint8Array {
    return registry.createType("DealProposal", this).toU8a();
  }
}

export class SignedRpc {
  client_signature: SignatureWrapper;
  deal_proposal: Rpc;

  constructor(client_signature: SignatureWrapper, deal_proposal: Rpc) {
    this.client_signature = client_signature;
    this.deal_proposal = deal_proposal;
  }
}
