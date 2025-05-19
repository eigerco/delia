import { ApiPromise, WsProvider } from "@polkadot/api";
import type { TypeRegistry, u64 } from "@polkadot/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { GlobalCtx, TokenProperties } from "./GlobalCtx";
import { COLLATOR_LOCAL_RPC_URL } from "./lib/consts";

export type Status =
  | { type: "connecting" }
  | { type: "connected" }
  | { type: "loading" }
  | { type: "loaded" }
  | { type: "disconnected" }
  | { type: "failed"; error: string };

export function GlobalCtxProvider({
  registry,
  children,
}: React.PropsWithChildren<{ registry: TypeRegistry }>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [wsAddress, setWsAddress] = useState(() => {
    return searchParams.get("rpc") || localStorage.getItem("wsAddress") || COLLATOR_LOCAL_RPC_URL;
  });

  // setSearchParams() only updates if the value actually changes,
  // so React Router doesn’t re-render if you set the same query params.
  // Reference: https://reactrouter.com/api/hooks/useSearchParams#notes
  useEffect(() => {
    localStorage.setItem("wsAddress", wsAddress);

    const nodeUrl = searchParams.get("rpc");
    const newParams = new URLSearchParams(searchParams);
    if (!wsAddress || wsAddress === COLLATOR_LOCAL_RPC_URL) {
      if (nodeUrl) {
        // Remove ?rpc if it's reset or equal to the default
        newParams.delete("rpc");
        setSearchParams(newParams);
      }
    } else if (nodeUrl !== wsAddress) {
      // Otherwise update the URL
      newParams.set("rpc", wsAddress);
      setSearchParams(newParams);
    }
  }, [wsAddress, searchParams, setSearchParams]);

  const collatorWsProviderRef = useRef<WsProvider | null>(null);
  const collatorWsRef = useRef<ApiPromise | null>(null);
  const [status, setStatus] = useState<Status>({ type: "connecting" });
  const [latestFinalizedBlock, setLatestFinalizedBlock] = useState<number | null>(null);
  const [latestBlockTimestamp, setLatestBlockTimestamp] = useState<Date | null>(null);
  const [tokenProperties, setTokenProperties] = useState<TokenProperties>(TokenProperties.preset());

  const connect = useCallback(async () => {
    const wsProvider = new WsProvider(wsAddress);
    collatorWsProviderRef.current = wsProvider;

    wsProvider.on("connected", () => {
      console.log("WS ready!");

      // The reason for setting `connecting` instead of connected is:
      // When it's reconnected to ws, it isn't reconnected to the whole thing yet.
      // subscribeFinalizedHeads method will execute and set to 'connected' when it's finished querying for the last block & friends.
      setStatus({ type: "connecting" });
    });

    wsProvider.on("disconnected", () => {
      console.error("WS disconnected!");
      setStatus({ type: "disconnected" });
    });

    try {
      setStatus({ type: "connecting" });
      console.log(`Connecting to ${wsAddress}`);
      const polkaStorageApi = await ApiPromise.create({
        provider: wsProvider,
        throwOnConnect: true,
      });
      collatorWsRef.current = polkaStorageApi;

      await polkaStorageApi.isReady;

      // While `fromApi` throws, it's a chain bug for it to do so, not a front end issue
      // as such, being loud and crashing the app is better than limping along and providing wrong units to the clients
      setTokenProperties(await TokenProperties.fromApi(polkaStorageApi));

      console.log(`Connected to ${await polkaStorageApi.rpc.system.chain()}`);

      const unsub = await polkaStorageApi.rpc.chain.subscribeFinalizedHeads(async (header) => {
        const blockNumber = header.number.toNumber();

        const blockHash = header.hash.toHex();
        const apiAt = await polkaStorageApi.at(blockHash);
        const blockTimestamp = ((await apiAt.query.timestamp.now()) as u64).toNumber();
        const timestamp = new Date(blockTimestamp);

        setLatestFinalizedBlock(blockNumber);
        setLatestBlockTimestamp(timestamp);

        setStatus({ type: "connected" });
      });

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
      setWsAddress,
      latestFinalizedBlock:
        latestFinalizedBlock && latestBlockTimestamp
          ? { number: latestFinalizedBlock, timestamp: latestBlockTimestamp }
          : null,
      collatorWsProvider: collatorWsProviderRef.current,
      collatorWsApi: collatorWsRef.current,
      collatorConnectionStatus: status,
      tokenProperties: tokenProperties,
    }),
    [registry, wsAddress, latestFinalizedBlock, status, latestBlockTimestamp, tokenProperties],
  );

  return <GlobalCtx.Provider value={value}>{children}</GlobalCtx.Provider>;
}
