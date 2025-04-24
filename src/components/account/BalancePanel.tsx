import { Tooltip } from "react-tooltip";
import { getRelativeTime } from "../../lib/time";
import { Balance, type BalanceStatus } from "../Balance";

interface BalancePanelProps {
  selectedAddress: string;
  walletBalance: BalanceStatus;
  marketBalance: BalanceStatus;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export function BalancePanel({
  selectedAddress,
  walletBalance,
  marketBalance,
  lastUpdated,
  onRefresh,
}: BalancePanelProps) {
  if (!selectedAddress) return null;

  return (
    <div className="border rounded p-4 bg-gray-50 space-y-3">
      <h3 className="text-lg font-semibold">💼 Balances</h3>

      <Balance status={walletBalance} balanceType="Wallet" />
      <Balance status={marketBalance} balanceType="Market" />

      <div className="relative w-fit">
        <button
          id="refresh-balances-btn"
          type="button"
          onClick={onRefresh}
          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm transition"
        >
          🔄 Refresh Balances
        </button>
        {lastUpdated && (
          <Tooltip
            anchorSelect="#refresh-balances-btn"
            content={`Last updated ${getRelativeTime(lastUpdated)}`}
            place="right"
          />
        )}
      </div>
    </div>
  );
}
