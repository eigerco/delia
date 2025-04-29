import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import { Transaction, type TransactionStatus } from "./transactionStatus";

interface SendTransactionOptions {
  api: ApiPromise;
  tx: SubmittableExtrinsic<"promise">;
  selectedAddress: string;
  onStatusChange: (status: TransactionStatus) => void;
  onSuccess: () => void;
}

export async function sendTransaction({
  api,
  tx,
  selectedAddress,
  onStatusChange,
  onSuccess,
}: SendTransactionOptions) {
  try {
    onStatusChange(Transaction.loading());

    const unsub = await tx.signAndSend(selectedAddress, ({ status, dispatchError, txHash }) => {
      if (!status.isInBlock && !status.isFinalized) {
        return;
      }
      try {
        if (!dispatchError) {
          const txHashHex = txHash.toHex();
          onStatusChange(Transaction.success(txHashHex));
          onSuccess();
          return;
        }

        if (!dispatchError.isModule) {
          onStatusChange(Transaction.error(dispatchError.toString()));
          return;
        }

        const decoded = api.registry.findMetaError(dispatchError.asModule);
        const { docs, name, section } = decoded;
        const userMessage = docs.join(" ") || `${section}.${name}`;

        onStatusChange(Transaction.error(userMessage));
      } finally {
        unsub();
      }
    });
  } catch (err) {
    console.error("Transaction failed", err);
    if (err instanceof Error) {
      const isDuplicate =
        err.message.includes("1013") || err.message.includes("Transaction Already Imported");

      const userMessage = isDuplicate
        ? "Your transaction is already being processed."
        : "Transaction failed.";

      onStatusChange(Transaction.error(userMessage));
    } else {
      onStatusChange(Transaction.error("Failed to decode incoming error, see logs for details."));
    }
  }
}
