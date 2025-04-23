import { formatBalance } from "@polkadot/util";

export type BalanceStatus =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "fetched"; value: number }
  | { type: "error"; message: string };

export function Balance({
  status,
  balanceType,
}: {
  status: BalanceStatus;
  balanceType: string;
}) {
  switch (status.type) {
    case "loading":
      return (
        <p className="mt-1 text-sm text-gray-400">
          {balanceType} Balance: <span className="italic text-gray-400">(loading...)</span>
        </p>
      );

    case "error":
      return <p className="mt-1 text-sm text-red-500">Error loading balance</p>;

    case "fetched":
      return (
        <p className="mt-1 text-sm text-gray-500">
          {balanceType} Balance: {formatBalance(status.value, { withUnit: false, withSi: false })}{" "}
          DOT
        </p>
      );

    case "idle":
      return null;
  }
}
