import type { ApiPromise } from "@polkadot/api";
import type { TypeRegistry } from "@polkadot/types";
import { createContext, useContext } from "react";
import { GlobalCtxProvider, type Status } from "./GlobalCtxProvider";

export type Ctx = {
  registry: TypeRegistry;
  wsAddress: string;
  latestFinalizedBlock: { number: number; timestamp: Date } | null;
  collatorWsApi: ApiPromise | null;
  collatorConnectionStatus: Status;
};

export const GlobalCtx = createContext<Ctx | null>(null);

export function useCtx() {
  const ctx = useContext(GlobalCtx);
  if (!ctx) {
    throw new Error(`${useCtx.name} must be within a ${GlobalCtxProvider.name}`);
  }
  return ctx;
}
