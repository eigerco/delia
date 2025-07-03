// NOTE: ideally, this module will be gone once we get the ports issue settled
export const DEFAULT_LOCAL_STORAGE_ADDRESS = { ip: "127.0.0.1", port: 8001 };
export const DEFAULT_LOCAL_RPC_ADDRESS = { ip: "127.0.0.1", port: 8000 };
export const COLLATOR_LOCAL_RPC_URL = "ws://127.0.0.1:42069"; // TODO: replace with some mechanism like polkadot.js
// Block Time in milliseconds, needs to match current runtime.
export const BLOCK_TIME = 6000;
export const INDEX_PATH = "/";
export const DOWNLOAD_PATH = "/download";
