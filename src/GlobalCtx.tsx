import type { TypeRegistry } from "@polkadot/types";
import { createContext, useContext } from "react";
import { GlobalCtxProvider } from "./GlobalCtxProvider";

export type Ctx = {
  registry: TypeRegistry;
  wsAddress: string;
};

export const GlobalCtx = createContext<Ctx | null>(null);

export function useCtx() {
  const ctx = useContext(GlobalCtx);
  if (!ctx) {
    throw new Error(`${useCtx.name} must be within a ${GlobalCtxProvider.name}`);
  }
  return ctx;
}
