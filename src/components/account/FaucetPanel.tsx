import { useState } from "react";
import toast from "react-hot-toast";
import { useCtx } from "../../GlobalCtx";
import { sendUnsigned } from "../../lib/sendTransaction";
import { Transaction, TransactionState, type TransactionStatus } from "../../lib/transactionStatus";
import { Button } from "../buttons/Button";

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
        loading: "Requesting funds...",
        success: "Funds added successfully!",
        error: (err) => `Faucet request failed: ${err}`,
      },
    );
  };

  return (
    <div className="border rounded p-4 bg-gray-50 space-y-3">
      <h3 className="text-lg font-semibold">💧 Faucet Drip</h3>
      <p className="text-sm">
        Use this to request testnet funds from the faucet. No signature is required.
      </p>

      <Button
        disabled={faucetStatus.state === TransactionState.Loading}
        loading={faucetStatus.state === TransactionState.Loading}
        onClick={handleDrip}
        variant="primary"
        tooltip={faucetStatus.state === TransactionState.Loading ? "Request in progress" : ""}
      >
        {faucetStatus.state === TransactionState.Loading
          ? "Requesting..."
          : "💰 Request 10 Test Tokens"}
      </Button>
    </div>
  );
}
