import { formatBalance } from "@polkadot/util";

export enum MarketBalanceStatus {
  Idle = "idle",
  Loading = "loading",
  Fetched = "fetched",
  Error = "error",
}

export function MarketBalance({
  value,
  status,
}: {
  value: string;
  status: MarketBalanceStatus;
}) {
  switch (status) {
    case "loading":
      return (
        <p className="mt-1 text-sm text-gray-400">
          Market Balance: <span className="italic text-gray-400">(loading...)</span>
        </p>
      );

    case "error":
      return <p className="mt-1 text-sm text-red-500">Error loading market balance</p>;

    case "fetched":
      if (/^\d+$/.test(value)) {
        return (
          <p className="mt-1 text-sm text-gray-500">
            Market Balance: {value} Planck = {formatBalance(value, {})}
          </p>
        );
      }
      return null;

    case "idle":
      return null;
  }
}
