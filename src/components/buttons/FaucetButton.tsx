import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useCtx } from "../../GlobalCtx";
import { fetchDripAmountConst } from "../../lib/consts";
import { loadWrapper } from "../../lib/loadWrapper";
import { sendUnsigned } from "../../lib/sendTransaction";
import { Transaction, TransactionState, type TransactionStatus } from "../../lib/transactionStatus";
import { Button } from "./Button";

interface FaucetButtonProps {
  selectedAddress: string;
  onSuccess: (txHash: string) => void;
}

export function FaucetButton({ selectedAddress, onSuccess }: FaucetButtonProps) {
  const { collatorWsApi: api, papiTypedApi, tokenProperties } = useCtx();
  const [faucetStatus, setFaucetStatus] = useState<TransactionStatus>(Transaction.idle);
  const [dripAmount, setDripAmount] = useState<string | null>(null);
  const [loadingDripAmount, setLoadingDripAmount] = useState<boolean>(true);

  useEffect(() => {
    const fetchDripAmount = async () => {
      if (!papiTypedApi) return;

      loadWrapper(() => fetchDripAmountConst(papiTypedApi, tokenProperties, setDripAmount), {
        onStart: () => setLoadingDripAmount(true),
        onEnd: () => setLoadingDripAmount(false),
        onError: () => {
          console.error("Error fetching FaucetDripAmount");
          setDripAmount(null);
        },
      });
    };

    fetchDripAmount();
  }, [papiTypedApi, tokenProperties]);

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

  const buttonText =
    faucetStatus.state === TransactionState.Loading
      ? "💧 Dripping..."
      : loadingDripAmount
        ? "🚰 Drip"
        : `🚰 Drip ${dripAmount?.toString()}`;

  return (
    <Button
      disabled={faucetStatus.state === TransactionState.Loading || loadingDripAmount}
      loading={faucetStatus.state === TransactionState.Loading}
      onClick={handleDrip}
      variant="primary"
      tooltip={
        faucetStatus.state === TransactionState.Loading
          ? "Request in progress"
          : loadingDripAmount
            ? "Loading faucet amount from chain"
            : ""
      }
    >
      {buttonText}
    </Button>
  );
}
