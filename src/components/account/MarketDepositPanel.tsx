import { useState } from "react";
import { useCtx } from "../../GlobalCtx";
import { Transaction, TransactionState, type TransactionStatus } from "../../lib/transactionStatus";

interface MarketDepositPanelProps {
  selectedAddress: string;
  walletBalance: bigint;
  onSuccess: () => void;
}

export function MarketDepositPanel({
  selectedAddress,
  walletBalance,
  onSuccess,
}: MarketDepositPanelProps) {
  const { collatorWsApi: api, tokenProperties } = useCtx();
  const [depositAmount, setDepositAmount] = useState(0n);
  const [depositStatus, setDepositStatus] = useState<TransactionStatus>(Transaction.idle);

  const handleDeposit = async () => {
    if (!api || !selectedAddress || !depositAmount) return;

    try {
      setDepositStatus(Transaction.loading);

      const unsub = await api.tx.market
        .addBalance(depositAmount)
        .signAndSend(selectedAddress, ({ status, dispatchError, txHash }) => {
          if (!status.isInBlock && !status.isFinalized) {
            return;
          }
          try {
            if (!dispatchError) {
              const txHashHex = txHash.toHex();
              setDepositStatus(Transaction.success(txHashHex));
              onSuccess();
              return;
            }
            if (!dispatchError.isModule) {
              setDepositStatus(Transaction.error(dispatchError.toString()));
              return;
            }
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            const { docs, name, section } = decoded;
            const userMessage = docs.join(" ") || `${section}.${name}`;

            setDepositStatus(Transaction.error(userMessage));
          } finally {
            unsub();
          }
        });
    } catch (err) {
      console.error("Balance top up failed", err);
      if (err instanceof Error) {
        const isDuplicate =
          err.message.includes("1013") || err.message.includes("Transaction Already Imported");

        const userMessage = isDuplicate
          ? "Your transaction is already being processed."
          : "Transaction failed.";

        setDepositStatus(Transaction.error(userMessage));
      } else {
        setDepositStatus(
          Transaction.error("Failed to decode incoming error, see logs for details."),
        );
      }
    }
  };

  return (
    <div className="border rounded p-4 bg-gray-50 space-y-3 w-full">
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
                <p>✅ Market top up successful!</p>
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
