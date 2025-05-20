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

export function secondsToDuration(seconds: number): {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
} {
  const MINUTE_IN_SECONDS = 60;
  const HOUR_IN_SECONDS = 60 * MINUTE_IN_SECONDS;
  const DAY_IN_SECONDS = 24 * HOUR_IN_SECONDS;
  if (seconds < MINUTE_IN_SECONDS) {
    return { seconds };
  }
  if (seconds < HOUR_IN_SECONDS) {
    const m = Math.floor(seconds / MINUTE_IN_SECONDS);
    const s = seconds - m * MINUTE_IN_SECONDS;
    return { minutes: m, seconds: s };
  }
  if (seconds < DAY_IN_SECONDS) {
    let remaining = seconds;
    const h = Math.floor(remaining / HOUR_IN_SECONDS);
    remaining -= h * HOUR_IN_SECONDS;
    const m = Math.floor(remaining / MINUTE_IN_SECONDS);
    remaining -= m * MINUTE_IN_SECONDS;
    return { hours: h, minutes: m, seconds: remaining };
  }
  let remaining = seconds;
  const d = Math.floor(remaining / DAY_IN_SECONDS);
  remaining -= d * DAY_IN_SECONDS;
  const h = Math.floor(remaining / HOUR_IN_SECONDS);
  remaining -= h * HOUR_IN_SECONDS;
  const m = Math.floor(remaining / MINUTE_IN_SECONDS);
  remaining -= m * MINUTE_IN_SECONDS;
  return { days: d, hours: h, minutes: m, seconds: remaining };
}

export function formatDuration(duration: {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}) {
  const result = [];
  for (const [k, v] of Object.entries(duration)) {
    if (v && v !== 0) {
      result.push(`${v} ${k}`);
    }
  }
  return `${result.join(", ")}`;
}
