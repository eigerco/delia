import { useState } from "react";
import toast from "react-hot-toast";
import { useCtx } from "../../GlobalCtx";
import { sendUnsigned } from "../../lib/sendTransaction";
import { Transaction, TransactionState, type TransactionStatus } from "../../lib/transactionStatus";
import { Button } from "./Button";

interface FaucetButtonProps {
  selectedAddress: string;
  onSuccess: (txHash: string) => void;
}

export function FaucetButton({ selectedAddress, onSuccess }: FaucetButtonProps) {
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
    <Button
      disabled={faucetStatus.state === TransactionState.Loading}
      loading={faucetStatus.state === TransactionState.Loading}
      onClick={handleDrip}
      variant="primary"
      tooltip={faucetStatus.state === TransactionState.Loading ? "Request in progress" : ""}
    >
      {faucetStatus.state === TransactionState.Loading ? "💧 Dripping..." : "🚰 Drip 10 Test Tokens"}
    </Button>
  );
}
