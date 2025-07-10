import type { polkaStorage } from "@polkadot-api/descriptors";
import type { TypedApi } from "polkadot-api";
import type { TokenProperties } from "../GlobalCtx";

// NOTE: ideally, this module will be gone once we get the ports issue settled
export const DEFAULT_LOCAL_STORAGE_ADDRESS = { ip: "127.0.0.1", port: 8001 };
export const DEFAULT_LOCAL_RPC_ADDRESS = { ip: "127.0.0.1", port: 8000 };
export const COLLATOR_LOCAL_RPC_URL = "ws://127.0.0.1:42069"; // TODO: replace with some mechanism like polkadot.js
// Block Time in milliseconds, needs to match current runtime.
export const BLOCK_TIME = 6000;
export const INDEX_PATH = "/";
export const DOWNLOAD_PATH = "/download";
export const DEFAULT_MAX_PROVE_COMMIT_DURATION = 50;
export const BLOCKS_IN_MINUTE = 10;
export const OFFSET = BLOCKS_IN_MINUTE * 5;
export const minutesToBlocks = (nBlocks: number) => nBlocks * BLOCKS_IN_MINUTE;
export const hoursToBlocks = (nBlocks: number) => 60 * minutesToBlocks(nBlocks);
export const daysToBlocks = (nBlocks: number) => 24 * hoursToBlocks(nBlocks);
export const monthsToBlocks = (nBlocks: number) => 30 * daysToBlocks(nBlocks);

export const fetchMaxProveCommitDurationConst = async (
  papiTypedApi: TypedApi<typeof polkaStorage>,
  setMaxProveCommitDuration: (value: number) => void,
) => {
  try {
    const value = await papiTypedApi.constants.StorageProvider.MaxProveCommitDuration();
    setMaxProveCommitDuration(value);
  } catch (err) {
    console.warn("Error fetching MaxProveCommitDuration from chain, using default", err);
  }
};

export const fetchDripAmountConst = async (
  papiTypedApi: TypedApi<typeof polkaStorage>,
  tokenProperties: TokenProperties,
  setDripAmount: (value: string) => void,
) => {
  try {
    const value = await papiTypedApi.constants.Faucet?.FaucetDripAmount();
    setDripAmount(tokenProperties.formatUnit(value));
  } catch (err) {
    console.warn("Error fetching DripAmount from chain", err);
  }
};
