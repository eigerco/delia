export function plank_to_dot(value: number): number {
  const PLANCKS_PER_DOT = 10_000_000_000;
  return value / PLANCKS_PER_DOT;
}
