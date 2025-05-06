import { useState } from "react";
import { useCtx } from "../../GlobalCtx";
import { sendTransaction } from "../../lib/sendTransaction";
import { Transaction, TransactionState, type TransactionStatus } from "../../lib/transactionStatus";
import { toastCustom } from "../Toast";

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
  const [isFocused, setIsFocused] = useState(false);

  if (!api) {
    throw new Error("Initialization failed");
  }

  const handleWithdraw = async () => {
    if (!api || !selectedAddress || !withdrawAmount) {
      throw new Error("Initialization failed");
    }

    await sendTransaction({
      api,
      tx: api.tx.market.withdrawBalance(withdrawAmount),
      selectedAddress,
      onStatusChange: (status) => {
        setWithdrawStatus(status);
        // We just expose the onSuccess to the upper levels
        if (status.state === TransactionState.Success) {
          toastCustom("✅ Market withdrawal successful!", true);
          toastCustom(`Tx Hash: ${status.txHash}`, true);
          onSuccess();
        } else if (status.state === TransactionState.Error) {
          toastCustom(`⚠️ ${status.message}`, false);
        }
      },
    });

    setWithdrawAmount(0n);
  };

  const isWithdrawalDisabled =
    withdrawStatus.state === TransactionState.Loading ||
    withdrawAmount === 0n ||
    withdrawAmount > marketBalance;

  const isZero = withdrawAmount <= 0n && isFocused;

  const isTooLarge = withdrawAmount > 0n && BigInt(withdrawAmount) > marketBalance && isFocused;

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-2">
      <h3 className="text-lg font-semibold">💰 Withdraw Market Balance</h3>
      <p className="text-sm text-gray-600">Enter the amount to withdraw (Planck units).</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={withdrawAmount.toString()}
          onChange={(e) => setWithdrawAmount(BigInt(e.target.value))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Amount in Planck"
          className="px-3 py-2 border rounded text-sm"
        />

        <span>= {tokenProperties.formatUnit(withdrawAmount, true)}</span>

        <button
          type="button"
          disabled={isWithdrawalDisabled}
          onClick={handleWithdraw}
          className={`px-3 py-2 rounded text-sm transition ${
            isWithdrawalDisabled
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
        >
          {withdrawStatus.state === TransactionState.Loading ? "⏳ Processing..." : "➖ Withdraw"}
        </button>
      </div>

      {isZero && <p className="text-sm text-red-600">⚠️ Withdraw amount must be greater than 0</p>}

      {isTooLarge && (
        <p className="text-sm text-red-600">
          ⚠️ You cannot withdraw more than your available market balance.
        </p>
      )}
    </div>
  );
}
