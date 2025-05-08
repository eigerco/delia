import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useCtx } from "../../GlobalCtx";
import { sendUnsigned } from "../../lib/sendTransaction";
import { Transaction, TransactionState, type TransactionStatus } from "../../lib/transactionStatus";
import { ToastMessage, ToastState } from "../Toast";

interface FaucetPanelProps {
  selectedAddress: string;
  onSuccess: (txHash: string) => void;
}

export function FaucetPanel({ selectedAddress, onSuccess }: FaucetPanelProps) {
  const { collatorWsApi: api } = useCtx();
  const [faucetStatus, setFaucetStatus] = useState<TransactionStatus>(Transaction.idle);

  const handleDrip = async () => {
    if (!api || !selectedAddress) {
      throw new Error("State hasn't been properly initialized");
    }

    await toast.promise(
      sendUnsigned({
        api,
        tx: api.tx.faucet.drip(selectedAddress),
        onStatusChange: (status) => {
          setFaucetStatus(status);
          if (status.state === TransactionState.Success) {
            onSuccess(status.txHash);
          }
        },
      }),
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
