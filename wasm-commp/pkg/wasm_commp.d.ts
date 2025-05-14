/* tslint:disable */
/* eslint-disable */
/**
 * Set up a logging layer that direct logs to the browser's console.
 */
export function setup_logging(): void;
/**
 * Generates the CommP (piece commitment) from the input file bytes.
 *
 * This function:
 * 1. Calculates the padded piece size.
 * 2. Applies zero-padding to the original bytes.
 * 3. Applies Fr32 padding.
 * 4. Builds a Merkle tree from 32-byte nodes.
 * 5. Returns the Merkle root (CommP) as a CID.
 *
 * # Arguments
 * * `data` - The original unpadded file bytes.
 *
 * # Returns
 * A JS string containing the CID.
 */
export function commpFromBytes(data: Uint8Array): any;
/**
 * Computes the padded piece size of a CAR file buffer according to Filecoin specs.
 *
 * # Arguments
 * * `data` - The full file buffer (e.g. a CAR file).
 *
 * # Returns
 * A JS string representing the padded piece size in bytes.
 */
export function paddedPieceSize(data: Uint8Array): any;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly setup_logging: () => void;
  readonly commpFromBytes: (a: number, b: number) => [number, number, number];
  readonly paddedPieceSize: (a: number, b: number) => [number, number, number];
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_2: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
