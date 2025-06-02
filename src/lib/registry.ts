import { TypeRegistry } from "@polkadot/types";

export function setupTypeRegistry(): TypeRegistry {
  const registry = new TypeRegistry();
  registry.register({
    DealState: {
      _enum: {
        Published: null,
        Active: "u64",
      },
    },
    DealProposal: {
      piece_cid: "Bytes",
      piece_size: "u64",
      client: "AccountId",
      provider: "AccountId",
      label: "Bytes",
      start_block: "u64",
      end_block: "u64",
      storage_price_per_block: "u128",
      state: "DealState",
    },
  });
  return registry;
}
