import { useState } from "react";
import toast from "react-hot-toast";
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
  const [isFocused, setIsFocused] = useState(false);

  if (!api) {
    throw new Error("State hasn't been properly initialized");
  }

  const handleDeposit = async () => {
    if (!api || !selectedAddress || !depositAmount) {
      throw new Error("State hasn't been properly initialized");
    }

    await toast.promise(
      sendTransaction({
        api,
        tx: api.tx.market.addBalance(depositAmount),
        selectedAddress,
        onStatusChange: (status) => {
          setDepositStatus(status);
          // We just expose the onSuccess to the upper levels
          if (status.state === TransactionState.Success) {
            onSuccess();
          }
        },
      }),
      {
        loading: "Processing market deposit...",
        success: (txHash) => (
          <>
            Market deposit successful!
            <br />
            Tx Hash: <code className="break-all">{txHash}</code>
          </>
        ),
        error: (err) => `Deposit failed: ${err}`,
      },
    );

    setDepositAmount(0n);
  };

  const isDepositDisabled =
    depositStatus.state === TransactionState.Loading ||
    depositAmount <= 0n ||
    depositAmount > walletBalance;

  const isZero = depositAmount <= 0n && isFocused;

  const isTooLarge = depositAmount > 0n && BigInt(depositAmount) > walletBalance && isFocused;

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-2">
      <h3 className="text-lg font-semibold">🛒 Deposit Market Balance</h3>
      <p className="text-sm text-gray-600">Enter the amount to deposit (Planck units).</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={depositAmount.toString()}
          onChange={(e) => setDepositAmount(BigInt(e.target.value))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Amount in Planck"
          className="px-3 py-2 border rounded text-sm"
        />

        <span>= {tokenProperties.formatUnit(depositAmount, true)}</span>

        <button
          type="button"
          disabled={isDepositDisabled}
          onClick={handleDeposit}
          className={`px-3 py-2 rounded text-sm transition ${
            isDepositDisabled
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {depositStatus.state === TransactionState.Loading ? "⏳ Processing..." : "➕ Deposit"}
        </button>
      </div>

      {isZero && <p className="text-sm text-red-600">⚠️ Deposit value must be greater than 0.</p>}

      {isTooLarge && (
        <p className="text-sm text-red-600">
          ⚠️ You cannot deposit more than your available wallet balance.
        </p>
      )}
    </div>
  );
}
