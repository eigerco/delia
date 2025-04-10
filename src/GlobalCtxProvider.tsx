import { ApiPromise, WsProvider } from "@polkadot/api";
import type { TypeRegistry } from "@polkadot/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlobalCtx } from "./GlobalCtx";

export type Status =
  | { type: "connecting" }
  | { type: "connected" }
  | { type: "loading" }
  | { type: "loaded" }
  | { type: "failed"; error: string };

export function GlobalCtxProvider({
  wsAddress,
  registry,
  children,
}: React.PropsWithChildren<{ registry: TypeRegistry; wsAddress: string }>) {
  const collatorWsRef = useRef<ApiPromise | null>(null);
  const [status, setStatus] = useState<Status>({ type: "connecting" });
  const [latestFinalizedBlock, setLatestFinalizedBlock] = useState<number | null>(null);

  const connect = useCallback(async () => {
    const wsProvider = new WsProvider(wsAddress);

    try {
      setStatus({ type: "connecting" });
      console.log(`Connecting to ${wsAddress}`);
      const polkaStorageApi = await ApiPromise.create({
        provider: wsProvider,
        throwOnConnect: true,
      });
      collatorWsRef.current = polkaStorageApi;

      await polkaStorageApi.isReady;

      console.log(`Connected to ${await polkaStorageApi.rpc.system.chain()}`);

      const unsub = await collatorWsRef.current.rpc.chain.subscribeFinalizedHeads((header) => {
        setLatestFinalizedBlock(header.number.toNumber());
      });

      setStatus({ type: "connected" });
      return unsub;
    } catch (error) {
      if (error instanceof Error) {
        setStatus({ type: "failed", error: error.message });
      } else {
        console.error(error);
        setStatus({
          type: "failed",
          error: "Failed to connect to the chain, check the logs for more information",
        });
      }

      wsProvider.disconnect().then(() => console.log(`disconnected from ${wsAddress}`));
    }
  }, [wsAddress]);

  useEffect(() => {
    const cleanup = connect();

    return () => {
      if (cleanup) {
        cleanup.then((c) => c?.());
      }
      collatorWsRef.current?.disconnect();
      collatorWsRef.current = null;
    };
  }, [connect]);

  const value = useMemo(
    () => ({
      registry,
      wsAddress,
      latestFinalizedBlock,
      collatorWsApi: collatorWsRef.current,
      collatorConnectionStatus: status,
    }),
    [registry, wsAddress, latestFinalizedBlock, status],
  );

  return <GlobalCtx.Provider value={value}>{children}</GlobalCtx.Provider>;
}
