import { TypeRegistry } from "@polkadot/types";

export function setupTypeRegistry(): TypeRegistry {
  const registry = new TypeRegistry();
  registry.register({
    DealState: {
      _enum: {
        Published: null,
        Active: "BlockNumber",
      },
    },
    DealProposal: {
      piece_cid: "Bytes",
      piece_size: "u64",
      client: "AccountId",
      provider: "AccountId",
      label: "Bytes",
      start_block: "BlockNumber",
      end_block: "BlockNumber",
      storage_price_per_block: "u128",
      state: "DealState",
    },
  });
  return registry;
}
