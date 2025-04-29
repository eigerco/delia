import { useState } from "react";
import { useCtx } from "../../GlobalCtx";
import { sendTransaction } from "../../lib/sendTransaction";
import { Transaction, TransactionState, type TransactionStatus } from "../../lib/transactionStatus";

interface MarketWithdrawalProps {
  selectedAddress: string;
  marketBalance: bigint;
  onSuccess: () => void;
}

export function MarketWithdrawal({
  selectedAddress,
  marketBalance,
  onSuccess,
}: MarketWithdrawalProps) {
  const { collatorWsApi: api, tokenProperties } = useCtx();
  const [withdrawAmount, setWithdrawAmount] = useState(0n);
  const [withdrawStatus, setWithdrawStatus] = useState<TransactionStatus>(Transaction.idle);

  if (!api) {
    console.error("WebSocket api is null");
    return;
  }

  const handleWithdraw = async () => {
    if (!api || !selectedAddress || !withdrawAmount) return;

    await sendTransaction({
      api,
      tx: api.tx.market.withdrawBalance(withdrawAmount),
      selectedAddress,
      onStatusChange: setWithdrawStatus,
      onSuccess,
    });
  };

  return (
    <div className="flex-1 min-w-0 space-y-3">
      <h3 className="text-lg font-semibold">💰 Withdraw Market Balance</h3>
      <p className="text-sm text-gray-600">Enter the amount to withdraw (Planck units).</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={withdrawAmount.toString()}
          onChange={(e) => setWithdrawAmount(BigInt(e.target.value))}
          placeholder="Amount in Planck"
          className="px-3 py-2 border rounded text-sm"
        />

        <span>= {tokenProperties.formatUnit(withdrawAmount, true)}</span>

        <button
          type="button"
          disabled={
            withdrawStatus.state === TransactionState.Loading ||
            withdrawAmount === 0n ||
            withdrawAmount > marketBalance
          }
          onClick={handleWithdraw}
          className={`px-3 py-2 rounded text-sm transition ${
            withdrawStatus.state === TransactionState.Loading
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-red-600 text-white hover:bg-green-700"
          }`}
        >
          {withdrawStatus.state === TransactionState.Loading ? "⏳ Processing..." : "➖ Withdraw"}
        </button>
      </div>

      {withdrawAmount !== 0n && BigInt(withdrawAmount) > marketBalance && (
        <p className="text-sm text-red-600">
          ⚠️ You cannot withdraw more than your available market balance.
        </p>
      )}

      {(() => {
        switch (withdrawStatus.state) {
          case TransactionState.Success:
            return (
              <div className="text-sm text-green-600 space-y-1">
                <p>✅ Withdrawal successful!</p>
                <p>Tx Hash: {withdrawStatus.txHash}</p>
              </div>
            );
          case TransactionState.Error:
            return <p className="text-sm text-red-600">⚠️ {withdrawStatus.message}</p>;
          default:
            return <></>;
        }
      })()}
    </div>
  );
}
