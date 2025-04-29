import { useCtx } from "../GlobalCtx";

export namespace BalanceStatus {
  export function idle(): BalanceStatus {
    return { state: BalanceState.Idle };
  }

  export function loading(): BalanceStatus {
    return { state: BalanceState.Loading };
  }

  export function fetched(value: number | bigint): BalanceStatus {
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
  | { state: BalanceState.Fetched; value: number | bigint }
  | { state: BalanceState.Error; message: string };

export function Balance({
  status,
  balanceType,
}: {
  status: BalanceStatus;
  balanceType: string;
}) {
  const { tokenProperties } = useCtx();

  if (status.state === BalanceState.Idle) return null;

  let balanceContent: React.ReactNode;

  switch (status.state) {
    case BalanceState.Loading:
      balanceContent = <span className="italic">(loading...)</span>;
      break;

    case BalanceState.Error:
      balanceContent = <span className="text-red-500">Error loading balance</span>;
      break;

    case BalanceState.Fetched:
      balanceContent = <span>{tokenProperties.formatUnit(status.value)}</span>;
      break;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="w-32">{balanceType} Balance:</div>
      {balanceContent}
    </div>
  );
}
