import { BLOCK_TIME } from "./consts";

export function planckToDot(value: number): number {
  const PLANCKS_PER_DOT = 10_000_000_000;
  return value / PLANCKS_PER_DOT;
}
export function blockToTime(
  block: number,
  currentBlock: number,
  currentBlockTimestamp: Date,
): Date {
  const timeDifference = (block - currentBlock) * BLOCK_TIME;
  const realTime = new Date(currentBlockTimestamp.getTime() + timeDifference);

  return realTime;
}
