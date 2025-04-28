export namespace Transaction {
  export function idle(): TransactionStatus {
    return { state: TransactionState.Idle };
  }
  export function loading(): TransactionStatus {
    return { state: TransactionState.Loading };
  }
  export function success(txHash: string): TransactionStatus {
    return { state: TransactionState.Success, txHash };
  }
  export function error(message: string): TransactionStatus {
    return { state: TransactionState.Error, message };
  }
}

export enum TransactionState {
  Idle = "idle",
  Loading = "loading",
  Success = "success",
  Error = "error",
}

export type TransactionStatus =
  | { state: TransactionState.Idle }
  | { state: TransactionState.Loading }
  | { state: TransactionState.Success; txHash: string }
  | { state: TransactionState.Error; message: string };
