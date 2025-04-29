import { BLOCK_TIME } from "./consts";

export function blockToTime(
  block: number,
  currentBlock: number,
  currentBlockTimestamp: Date,
): Date {
  const timeDifference = (block - currentBlock) * BLOCK_TIME;
  const realTime = new Date(currentBlockTimestamp.getTime() + timeDifference);

  return realTime;
}
