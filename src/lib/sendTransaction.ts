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
  // This functions flow is very similar to the sendUnsigned function.
  // See the sendUnsigned function documentation for more information.
  let unsubscribe: (() => void) | undefined;
  const sendPromise: Promise<string> = new Promise((resolve, reject) => {
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
    })
      .then((unsub) => {
        unsubscribe = unsub;
      })
      .catch((err) => {
        onStatusChange(Transaction.error("Transaction failed"));
        reject(err);
      });
  });

  const finalTxHash = await sendPromise.finally(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
  return finalTxHash;
}

interface UnsignedTransactionArgs {
  api: ApiPromise;
  tx: SubmittableExtrinsic<"promise">;
  onStatusChange: (status: TransactionStatus) => void;
}

export async function sendUnsigned({
  api,
  tx,
  onStatusChange,
}: UnsignedTransactionArgs): Promise<string> {
  // let bind unsubscribe so we can assign it to the promise that tx.send returns.
  // We need to unsub otherwise the transaction state gets fucked up.
  // We only have undefined here to make sure tx.send's return gets assigned.
  let unsubscribe: (() => void) | undefined;
  // Create promise for sending so we can await within function scope
  const sendPromise: Promise<string> = new Promise((sendResolve, sendReject) => {
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
    })
      .then((unsub) => {
        // Assign unsubscribe to tx.send's returned promise.
        // This will always happen, resulting in the unsubscribe never being undefined.
        unsubscribe = unsub;
      })
      .catch((err) => {
        onStatusChange(Transaction.error("Transaction failed"));
        sendReject(err);
      });
  });

  // Resolve the send promise and unsubscribe, this clears the txn state.
  const txHash = await sendPromise.finally(() => {
    // This should always be true because tx.send will always return a promise.
    if (unsubscribe) {
      unsubscribe();
    }
  });
  return txHash;
}
