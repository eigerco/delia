import { useState } from "react";
import { useCtx } from "../../GlobalCtx";
import { sendTransaction } from "../../lib/sendTransaction";
import { Transaction, TransactionState, type TransactionStatus } from "../../lib/transactionStatus";

interface MarketDepositProps {
  selectedAddress: string;
  walletBalance: bigint;
  onSuccess: () => void;
}

export function MarketDeposit({ selectedAddress, walletBalance, onSuccess }: MarketDepositProps) {
  const { collatorWsApi: api, tokenProperties } = useCtx();
  const [depositAmount, setDepositAmount] = useState(0n);
  const [depositStatus, setDepositStatus] = useState<TransactionStatus>(Transaction.idle);

  if (!api) {
    console.error("WebSocket api is null");
    return;
  }

  const handleDeposit = async () => {
    if (!api || !selectedAddress || !depositAmount) return;

    await sendTransaction({
      api,
      tx: api.tx.market.addBalance(depositAmount),
      selectedAddress,
      onStatusChange: setDepositStatus,
      onSuccess,
    });
  };

  return (
    <div className="flex-1 min-w-0 space-y-3">
      <h3 className="text-lg font-semibold">🛒 Deposit Market Balance</h3>
      <p className="text-sm text-gray-600">Enter the amount to deposit (Planck units).</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={depositAmount.toString()}
          onChange={(e) => setDepositAmount(BigInt(e.target.value))}
          placeholder="Amount in Planck"
          className="px-3 py-2 border rounded text-sm"
        />

        <span>= {tokenProperties.formatUnit(depositAmount, true)}</span>

        <button
          type="button"
          disabled={
            depositStatus.state === TransactionState.Loading ||
            depositAmount === 0n ||
            depositAmount > walletBalance
          }
          onClick={handleDeposit}
          className={`px-3 py-2 rounded text-sm transition ${
            depositStatus.state === TransactionState.Loading
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {depositStatus.state === TransactionState.Loading ? "⏳ Processing..." : "➕ Deposit"}
        </button>
      </div>

      {depositAmount !== 0n && BigInt(depositAmount) > walletBalance && (
        <p className="text-sm text-red-600">
          ⚠️ You cannot deposit more than your available wallet balance.
        </p>
      )}

      {(() => {
        switch (depositStatus.state) {
          case TransactionState.Success:
            return (
              <div className="text-sm text-green-600 space-y-1">
                <p>✅ Market deposit successful!</p>
                <p>Tx Hash: {depositStatus.txHash}</p>
              </div>
            );
          case TransactionState.Error:
            return <p className="text-sm text-red-600">⚠️ {depositStatus.message}</p>;
          default:
            return <></>;
        }
      })()}
    </div>
  );
}
