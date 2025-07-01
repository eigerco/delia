import { getRelativeTime } from "../../lib/time";
import { Balance, type BalanceStatus } from "../Balance";
import { Button } from "../buttons/Button";

interface BalancePanelProps {
  selectedAddress: string;
  walletBalance: BalanceStatus;
  lastUpdated: Date | null;
  onRefresh: () => void;
}

export function BalancePanel({
  selectedAddress,
  walletBalance,
  lastUpdated,
  onRefresh,
}: BalancePanelProps) {
  if (!selectedAddress) return null;

  return (
    <div className="border rounded p-4 bg-gray-50 space-y-3">
      <h3 className="text-lg font-semibold">💼 Balances</h3>

      <Balance
        status={walletBalance}
        balanceType="Wallet"
        tooltip="Balance available in your wallet"
      />

      <div className="relative w-fit">
        <Button
          onClick={onRefresh}
          variant="secondary"
          size="md"
          tooltip={lastUpdated ? `Last updated ${getRelativeTime(lastUpdated)}` : ""}
        >
          🔄 Refresh Balances
        </Button>
      </div>
    </div>
  );
}
