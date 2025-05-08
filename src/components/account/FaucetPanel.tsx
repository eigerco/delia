import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useCtx } from "../../GlobalCtx";
import { Transaction, TransactionState, type TransactionStatus } from "../../lib/transactionStatus";
import { ToastMessage, ToastState } from "../Toast";

interface FaucetPanelProps {
  selectedAddress: string;
  onSuccess: (txHash: string) => void;
}

export function FaucetPanel({ selectedAddress, onSuccess }: FaucetPanelProps) {
  const { collatorWsApi: api } = useCtx();
  const [faucetStatus, setTransaction] = useState<TransactionStatus>(Transaction.idle);

  const handleDrip = async () => {
    if (!api || !selectedAddress) return;

    const promise = async () => {
      const tx = api.tx.faucet.drip(selectedAddress);

      const unsub = await tx.send(({ status, dispatchError, txHash }) => {
        if (!status.isInBlock && !status.isFinalized) return;

        try {
          if (!dispatchError) {
            const txHashHex = txHash.toHex();
            setTransaction(Transaction.success(txHashHex));
            onSuccess(txHashHex);
            return;
          }

          if (!dispatchError.isModule) {
            const message = dispatchError.toString();
            setTransaction(Transaction.error(message));
            throw new Error(message);
          }

          const decoded = api.registry.findMetaError(dispatchError.asModule);
          const { docs, name, section } = decoded;
          const userMessage =
            section === "faucet" && name === "FaucetUsedRecently"
              ? "You can only request tokens once every 24 hours."
              : docs.join(" ") || "Transaction failed.";

          setTransaction(Transaction.error(userMessage));
          throw new Error(userMessage);
        } catch (err) {
          throw new Error(String(err));
        } finally {
          unsub();
        }
      });
    };

    await toast.promise(
      promise,
      {
        loading: <ToastMessage message="Requesting funds..." state={ToastState.Loading} />,
        success: <ToastMessage message="Funds added successfully!" state={ToastState.Success} />,
        error: (err) => (
          <ToastMessage message={`Faucet request failed: ${err}`} state={ToastState.Error} />
        ),
      },
      {
        duration: 5000, // applies to success and error
        loading: { duration: Number.POSITIVE_INFINITY }, // keep loading toast visible until resolution
      },
    );
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

      <Toaster position="bottom-left" reverseOrder={true} />
    </div>
  );
}
