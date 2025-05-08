import type { ApiPromise } from "@polkadot/api";
import type { SubmittableExtrinsic } from "@polkadot/api/types";
import { Transaction, type TransactionStatus } from "./transactionStatus";

interface SignedTransactionArgs {
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
}: SignedTransactionArgs): Promise<string> {
  return new Promise((resolve, reject) => {
    onStatusChange(Transaction.loading());

    tx.signAndSend(selectedAddress, ({ status, dispatchError, txHash }) => {
      if (!status.isFinalized) return;

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

export async function sendUnsigned({
  api,
  tx,
  onStatusChange,
}: {
  api: ApiPromise;
  tx: SubmittableExtrinsic<"promise">;
  onStatusChange: (status: TransactionStatus) => void;
}): Promise<string> {
  const sendPromise = new Promise((sendResolve, sendReject) => {
    onStatusChange(Transaction.loading());

    tx.send(({ status, dispatchError, txHash }) => {
      if (!status.isFinalized) return;

      try {
        if (!dispatchError) {
          const txHashHex = txHash.toHex();
          onStatusChange(Transaction.success(txHashHex));
          sendResolve(txHashHex);
        } else if (!dispatchError.isModule) {
          const message = dispatchError.toString();
          onStatusChange(Transaction.error(message));
          sendReject(message);
        } else {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          const userMessage = decoded.docs.join(" ") || `${decoded.section}.${decoded.name}`;
          onStatusChange(Transaction.error(userMessage));
          sendReject(userMessage);
        }
      } catch (e) {
        sendReject(e);
      }
    }).catch((err) => {
      onStatusChange(Transaction.error("Transaction failed"));
      sendReject(err);
    });
  });

  const txHash = await sendPromise;
  return txHash;
}
