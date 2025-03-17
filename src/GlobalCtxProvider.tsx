import { useMemo } from "react";
import { type Ctx, GlobalCtx } from "./GlobalCtx";

export function GlobalCtxProvider(props: React.PropsWithChildren<Ctx>) {
  const value = useMemo(
    () => ({ registry: props.registry, wsAddress: props.wsAddress }),
    [props.registry, props.wsAddress],
  );
  return <GlobalCtx.Provider value={value}>{props.children}</GlobalCtx.Provider>;
}
