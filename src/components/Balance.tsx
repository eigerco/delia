import { formatBalance } from "@polkadot/util";

export namespace BalanceStatus {
  export function idle(): BalanceStatus {
    return { type: BalanceType.Idle };
  }

  export function loading(): BalanceStatus {
    return { type: BalanceType.Loading };
  }

  export function fetched(value: number): BalanceStatus {
    return { type: BalanceType.Fetched, value };
  }

  export function error(message: string): BalanceStatus {
    return { type: BalanceType.Error, message };
  }
}

export enum BalanceType {
  Idle = "idle",
  Loading = "loading",
  Fetched = "fetched",
  Error = "error",
}

export type BalanceStatus =
  | { type: BalanceType.Idle }
  | { type: BalanceType.Loading }
  | { type: BalanceType.Fetched; value: number }
  | { type: BalanceType.Error; message: string };

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
