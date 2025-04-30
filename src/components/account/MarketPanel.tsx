import { MarketDeposit } from "./MarketDeposit";
import { MarketWithdrawal } from "./MarketWithdrawal";

interface MarketPanelProps {
  selectedAddress: string;
  walletBalance: bigint;
  marketBalance: bigint;
  onSuccess: () => void;
}

export function MarketPanel({
  selectedAddress,
  walletBalance,
  marketBalance,
  onSuccess,
}: MarketPanelProps) {
  return (
    <div className="border rounded p-4 bg-gray-50 w-full flex flex-col md:flex-row gap-3">
      <MarketDeposit
        selectedAddress={selectedAddress}
        walletBalance={walletBalance}
        onSuccess={onSuccess}
      />

      <MarketWithdrawal
        selectedAddress={selectedAddress}
        marketBalance={marketBalance}
        onSuccess={onSuccess}
      />
    </div>
  );
}
