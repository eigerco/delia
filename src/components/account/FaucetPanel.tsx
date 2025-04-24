import { useState } from "react";
import { useCtx } from "../../GlobalCtx";

namespace FaucetStatus {
  export function idle(): FaucetStatus {
    return { state: FaucetState.Idle };
  }
  export function loading(): FaucetStatus {
    return { state: FaucetState.Loading };
  }
  export function success(txHash: string): FaucetStatus {
    return { state: FaucetState.Success, txHash };
  }
  export function error(message: string): FaucetStatus {
    return { state: FaucetState.Error, message };
  }
}

enum FaucetState {
  Idle = "idle",
  Loading = "loading",
  Success = "success",
  Error = "error",
}

type FaucetStatus =
  | { state: FaucetState.Idle }
  | { state: FaucetState.Loading }
  | { state: FaucetState.Success; txHash: string }
  | { state: FaucetState.Error; message: string };

interface FaucetPanelProps {
  selectedAddress: string;
  onSuccess: (txHash: string) => void;
}

export function FaucetPanel({ selectedAddress, onSuccess }: FaucetPanelProps) {
  const { collatorWsApi: api } = useCtx();
  const [faucetStatus, setFaucetStatus] = useState<FaucetStatus>(FaucetStatus.idle);

  const handleDrip = async () => {
    if (!api || !selectedAddress) return;

    try {
      setFaucetStatus(FaucetStatus.loading);

      const unsub = await api.tx.faucet.drip(selectedAddress).send((result) => {
        const { status, dispatchError } = result;

        if (status.isInBlock || status.isFinalized) {
          if (dispatchError) {
            if (dispatchError.isModule) {
              const decoded = api.registry.findMetaError(dispatchError.asModule);
              const { docs, name, section } = decoded;

              const userMessage =
                section === "faucet" && name === "FaucetUsedRecently"
                  ? "You can only request tokens once every 24 hours."
                  : docs.join(" ") || "Transaction failed.";

              setFaucetStatus(FaucetStatus.error(userMessage));
              setTimeout(() => setFaucetStatus(FaucetStatus.idle), 4000);
            } else {
              setFaucetStatus(FaucetStatus.error(dispatchError.toString()));
              setTimeout(() => setFaucetStatus(FaucetStatus.idle), 4000);
            }
          } else {
            const txHash = result.txHash.toHex();
            setFaucetStatus(FaucetStatus.success(txHash));
            onSuccess(txHash);
          }

          unsub();
        }
      });
    } catch (err) {
      const rawMessage = (err as Error).message || "";
      const isDuplicate =
        rawMessage.includes("1013") || rawMessage.includes("Transaction Already Imported");

      const userMessage = isDuplicate
        ? "Your transaction is already being processed."
        : "Transaction failed.";

      setFaucetStatus(FaucetStatus.error(userMessage));
      setTimeout(() => setFaucetStatus(FaucetStatus.idle), 4000);
    }
  };

  return (
    <div className="border rounded p-4 bg-gray-50 space-y-3 w-full">
      <h3 className="text-lg font-semibold">💧 Faucet Drip</h3>
      <p className="text-sm text-gray-600">
        Use this to request testnet funds from the faucet. No signature is required.
      </p>

      <button
        type="button"
        disabled={faucetStatus.state === FaucetState.Loading}
        className={`px-3 py-2 rounded text-sm transition ${
          faucetStatus.state === FaucetState.Loading
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
        onClick={handleDrip}
      >
        {faucetStatus.state === FaucetState.Loading
          ? "\u23F3 Requesting..."
          : "\uD83D\uDCB0 Request 10 Test Tokens"}
      </button>

      {faucetStatus.state === FaucetState.Success && (
        <div className="text-sm text-green-600 space-y-1">
          <p>✅ Faucet top-up successful!</p>
          <p>Tx Hash: {faucetStatus.txHash}</p>
        </div>
      )}

      {faucetStatus.state === FaucetState.Error && (
        <p className="text-sm text-red-600">⚠️ {faucetStatus.message}</p>
      )}
    </div>
  );
}
