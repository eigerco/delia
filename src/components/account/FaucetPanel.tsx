import { useState } from "react";
import { useCtx } from "../../GlobalCtx";
import { Transaction, TransactionState, type TransactionStatus } from "../../lib/transactionStatus";

interface FaucetPanelProps {
  selectedAddress: string;
  onSuccess: (txHash: string) => void;
}

export function FaucetPanel({ selectedAddress, onSuccess }: FaucetPanelProps) {
  const { collatorWsApi: api } = useCtx();
  const [faucetStatus, setTransaction] = useState<TransactionStatus>(Transaction.idle);

  const handleDrip = async () => {
    if (!api || !selectedAddress) return;

    try {
      setTransaction(Transaction.loading);

      const unsub = await api.tx.faucet
        .drip(selectedAddress)
        .send(({ status, dispatchError, txHash }) => {
          if (!status.isInBlock && !status.isFinalized) {
            return;
          }
          try {
            if (!dispatchError) {
              const txHashHex = txHash.toHex();
              setTransaction(Transaction.success(txHashHex));
              onSuccess(txHashHex);
              return;
            }
            if (!dispatchError.isModule) {
              setTransaction(Transaction.error(dispatchError.toString()));
              return;
            }
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            const { docs, name, section } = decoded;
            const userMessage =
              section === "faucet" && name === "FaucetUsedRecently"
                ? "You can only request tokens once every 24 hours."
                : docs.join(" ") || "Transaction failed.";
            setTransaction(Transaction.error(userMessage));
          } finally {
            unsub();
          }
        });
    } catch (err) {
      if (err instanceof Error) {
        const isDuplicate =
          err.message.includes("1013") || err.message.includes("Transaction Already Imported");

        const userMessage = isDuplicate
          ? "Your transaction is already being processed."
          : "Transaction failed.";

        setTransaction(Transaction.error(userMessage));
      } else {
        console.error(err);
        setTransaction(Transaction.error("Failed to decode incoming error, see logs for details."));
      }
    }
  };

  return (
    <div className="border rounded p-4 bg-gray-50 space-y-3 w-full">
      <h3 className="text-lg font-semibold">💧 Transaction Drip</h3>
      <p className="text-sm">
        Use this to request testnet funds from the faucet. No signature is required.
      </p>

      <button
        type="button"
        disabled={faucetStatus.state === TransactionState.Loading}
        className={`px-3 py-2 rounded text-sm transition ${
          faucetStatus.state === TransactionState.Loading
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
        onClick={handleDrip}
      >
        {faucetStatus.state === TransactionState.Loading
          ? "\u23F3 Requesting..."
          : "\uD83D\uDCB0 Request 10 Test Tokens"}
      </button>

      {(() => {
        switch (faucetStatus.state) {
          case TransactionState.Success:
            return (
              <div className="text-sm text-green-600 space-y-1">
                <p>✅ Transaction top-up successful!</p>
                <p>Tx Hash: {faucetStatus.txHash}</p>
              </div>
            );
          case TransactionState.Error:
            return <p className="text-sm text-red-600">⚠️ {faucetStatus.message}</p>;
          default:
            return <></>;
        }
      })()}
    </div>
  );
}
