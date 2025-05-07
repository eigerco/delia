import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import { Transaction, type TransactionStatus } from "./transactionStatus";

interface SendTransactionArgs {
  api: ApiPromise;
  tx: SubmittableExtrinsic<"promise">;
  selectedAddress: string;
  onStatusChange: (status: TransactionStatus) => void;
}

export async function sendTransaction({
  api,
  tx,
  selectedAddress,
  onStatusChange,
}: SendTransactionArgs): Promise<string> {
  return new Promise((resolve, reject) => {
    onStatusChange(Transaction.loading());

    tx.signAndSend(selectedAddress, ({ status, dispatchError, txHash }) => {
      if (!status.isInBlock && !status.isFinalized) return;

      try {
        if (!dispatchError) {
          const txHashHex = txHash.toHex();
          onStatusChange(Transaction.success(txHashHex));
          resolve(txHashHex); // Resolve with txHash
        } else if (!dispatchError.isModule) {
          const message = dispatchError.toString();
          onStatusChange(Transaction.error(message));
          reject(message);
        } else {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          const userMessage = decoded.docs.join(" ") || `${decoded.section}.${decoded.name}`;
          onStatusChange(Transaction.error(userMessage));
          reject(userMessage);
        }
      } catch (e) {
        reject(e);
      }
    }).catch((err) => {
      onStatusChange(Transaction.error("Transaction failed"));
      reject(err);
    });
  });
}
