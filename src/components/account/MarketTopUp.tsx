import { useState } from "react";
import { useCtx } from "../../GlobalCtx";
import { Transaction, TransactionState, type TransactionStatus } from "../../lib/transactionStatus";

interface MarketTopUpProps {
  selectedAddress: string;
  walletBalance: bigint;
  onSuccess: () => void;
}

export function MarketTopUpPanel({ selectedAddress, walletBalance, onSuccess }: MarketTopUpProps) {
  const { collatorWsApi: api } = useCtx();
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpStatus, setTopUpStatus] = useState<TransactionStatus>(Transaction.idle);

  const handleTopUp = async () => {
    if (!api || !selectedAddress || !topUpAmount) return;

    try {
      setTopUpStatus(Transaction.loading);

      const unsub = await api.tx.market
        .addBalance(topUpAmount)
        .signAndSend(selectedAddress, ({ status, dispatchError, txHash }) => {
          if (!status.isInBlock && !status.isFinalized) {
            return;
          }
          try {
            if (!dispatchError) {
              const txHashHex = txHash.toHex();
              setTopUpStatus(Transaction.success(txHashHex));
              onSuccess();
              return;
            }
            if (!dispatchError.isModule) {
              setTopUpStatus(Transaction.error(dispatchError.toString()));
              return;
            }
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            const { docs, name, section } = decoded;
            const userMessage = docs.join(" ") || `${section}.${name}`;

            setTopUpStatus(Transaction.error(userMessage));
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

        setTopUpStatus(Transaction.error(userMessage));
      } else {
        setTopUpStatus(Transaction.error("Failed to decode incoming error, see logs for details."));
      }
    }
  };

  return (
    <div className="border rounded p-4 bg-gray-50 space-y-3 w-full">
      <h3 className="text-lg font-semibold">🛒 Top Up Market Balance</h3>
      <p className="text-sm text-gray-600">Enter the amount to deposit (Planck units).</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={topUpAmount}
          onChange={(e) => setTopUpAmount(e.target.value)}
          placeholder="Amount in Planck"
          className="px-3 py-2 border rounded text-sm"
        />

        <button
          type="button"
          disabled={
            topUpStatus.state === TransactionState.Loading ||
            topUpAmount === "" ||
            BigInt(topUpAmount) > walletBalance
          }
          onClick={handleTopUp}
          className={`px-3 py-2 rounded text-sm transition ${
            topUpStatus.state === TransactionState.Loading
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700"
          }`}
        >
          {topUpStatus.state === TransactionState.Loading ? "⏳ Processing..." : "➕ Top Up"}
        </button>
      </div>
      {topUpAmount !== "" && BigInt(topUpAmount) > walletBalance && (
        <p className="text-sm text-red-600">
          ⚠️ You cannot deposit more than your available wallet balance.
        </p>
      )}

      {(() => {
        switch (topUpStatus.state) {
          case TransactionState.Success:
            return (
              <div className="text-sm text-green-600 space-y-1">
                <p>✅ Market top up successful!</p>
                <p>Tx Hash: {topUpStatus.txHash}</p>
              </div>
            );
          case TransactionState.Error:
            return <p className="text-sm text-red-600">⚠️ {topUpStatus.message}</p>;
          default:
            return <></>;
        }
      })()}
    </div>
  );
}
