import { formatBalance } from "@polkadot/util";

export namespace BalanceStatus {
  export function idle(): BalanceStatus {
    return { state: BalanceState.Idle };
  }

  export function loading(): BalanceStatus {
    return { state: BalanceState.Loading };
  }

  export function fetched(value: number): BalanceStatus {
    return { state: BalanceState.Fetched, value };
  }

  export function error(message: string): BalanceStatus {
    return { state: BalanceState.Error, message };
  }
}

export enum BalanceState {
  Idle = "idle",
  Loading = "loading",
  Fetched = "fetched",
  Error = "error",
}

export type BalanceStatus =
  | { state: BalanceState.Idle }
  | { state: BalanceState.Loading }
  | { state: BalanceState.Fetched; value: number }
  | { state: BalanceState.Error; message: string };

export function Balance({
  status,
  balanceType,
}: {
  status: BalanceStatus;
  balanceType: string;
}) {
  switch (status.state) {
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
