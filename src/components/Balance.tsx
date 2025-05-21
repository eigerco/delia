import { HelpCircle } from "lucide-react";
import { Tooltip } from "react-tooltip";
import { useCtx } from "../GlobalCtx";

export namespace BalanceStatus {
  export function idle(): BalanceStatus {
    return { state: BalanceState.Idle };
  }

  export function loading(): BalanceStatus {
    return { state: BalanceState.Loading };
  }

  export function fetched(value: bigint): BalanceStatus {
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
  | { state: BalanceState.Fetched; value: bigint }
  | { state: BalanceState.Error; message: string };

export function Balance({
  status,
  balanceType,
  tooltip,
}: {
  status: BalanceStatus;
  balanceType: string;
  tooltip?: string;
}) {
  const { tokenProperties } = useCtx();

  if (status.state === BalanceState.Idle) return null;

  let balanceContent: React.ReactNode;

  const balanceId = `balance-${balanceType.replace(/\s+/g, "-").toLowerCase()}`;

  switch (status.state) {
    case BalanceState.Loading:
      balanceContent = <span className="italic">(loading...)</span>;
      break;

    case BalanceState.Error:
      balanceContent = <span className="text-red-500">Error loading balance</span>;
      break;

    case BalanceState.Fetched:
      balanceContent = <span>{tokenProperties.formatUnit(status.value, true)}</span>;
      break;
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className="w-50 flex items-center">
        <span>{balanceType} Balance:</span>
        {tooltip && (
          <div className="flex justify-center mx-1">
            <span id={`tooltip-${balanceId}`} className="cursor-help flex items-center">
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </span>
            <Tooltip anchorSelect={`#tooltip-${balanceId}`} content={tooltip} place="right" />
          </div>
        )}
      </div>
      {balanceContent}
    </div>
  );
}
