import { ApiPromise, WsProvider } from "@polkadot/api";
import { hexToU8a } from "@polkadot/util";
import { base58Encode } from "@polkadot/util-crypto";
import { AlertCircle, Loader2, RefreshCw, Server } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type StorageProviderInfo, isStorageProviderInfo } from "../lib/storageProvider";
import { ProviderButton } from "./buttons/ProviderButton";

const COLLATOR_RPC_URL = "ws://127.0.0.1:42069"; // TODO: replace with some mechanism like polkadot.js

enum Status {
  Connecting = 0,
  Connected = 1,
  Failed = 2,
  Loading = 3,
  Loaded = 4,
}

// Yes, returning a string here is kinda weird, but makes the control flow SO MUCH SIMPLER
// plus, throwing here is too much since these are supposed to be warnings
// biome-ignore lint/suspicious/noExplicitAny: any is a superset of AnyJson and easier to work with
const anyJsonToSpInfo = (key: string, value: any): StorageProviderInfo | string => {
  if (!value) {
    return `Provider ${key} has an undefined value, skipping...`;
  }
  if (typeof value !== "object") {
    return `Provider ${key} is of unsupported type ${typeof value}, skipping...`;
  }
  if (!("info" in value)) {
    return `Provider ${key} does not have an "info" field, skipping...`;
  }
  const spInfo = value.info;
  if (!isStorageProviderInfo(spInfo)) {
    return `Provider ${key} "info" field is not valid, skipping...`;
  }
  spInfo.peerId = base58Encode(hexToU8a(spInfo.peerId));
  return spInfo;
};

type ProviderSelectorProps = {
  providers: Map<string, StorageProviderInfo>;
  setProviders: (providers: Map<string, StorageProviderInfo>) => void;
  onSelectProvider: (provider: string) => void;
  selectedProviders: Set<string>;
};

export function ProviderSelector({
  providers,
  setProviders,
  onSelectProvider,
  selectedProviders,
}: ProviderSelectorProps) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(Status.Connecting);

  const apiPromiseRef = useRef<ApiPromise | null>(null);

  const handleError = useCallback((error: unknown) => {
    if (error instanceof Error) {
      setError(error.message);
    } else {
      console.error(error);
      setError("Failed to decode error, check the logs for more information");
    }
    setStatus(Status.Failed);
  }, []);

  const connectPolkadotApi = useCallback(async (): Promise<ApiPromise | null> => {
    setStatus(Status.Connecting);

    if (apiPromiseRef.current) {
      if (!apiPromiseRef.current.isConnected) {
        // No clue if this throws an error
        await apiPromiseRef.current.connect();
      }
      return apiPromiseRef.current;
    }

    try {
      // This should be parametrizeable
      const wsProvider = new WsProvider(COLLATOR_RPC_URL);
      console.log(`Connecting to ${COLLATOR_RPC_URL}`);
      const polkaStorageApi = await ApiPromise.create({
        provider: wsProvider,
      });
      apiPromiseRef.current = polkaStorageApi;
      console.log(`Connected to ${await polkaStorageApi.rpc.system.chain()}`);
      setStatus(Status.Connected);
      return polkaStorageApi;
    } catch (err) {
      handleError(err);
    }
    return null;
  }, [handleError]);

  // A liveness check before populating (or maybe populating but disabled)
  // would be great UX
  const getStorageProviders = useCallback(async () => {
    setError(null);

    const polkaStorageApi = await connectPolkadotApi();
    if (!polkaStorageApi) {
      console.warn("Unable to connect to the Polkadot API");
      return;
    }

    setStatus(Status.Loading);
    const newProviders = new Map();
    const entries = await polkaStorageApi.query.storageProvider.storageProviders.entries();
    for (const [key, value] of entries) {
      const accountId = key.args[0].toString();
      // biome-ignore lint/suspicious/noExplicitAny: any is a superset of AnyJson and easier to work with
      const spInfo = anyJsonToSpInfo(accountId, value.toJSON() as any);
      if (spInfo instanceof String) {
        console.warn(spInfo);
        continue;
      }
      newProviders.set(key.args[0].toString(), spInfo);
    }
    setProviders(newProviders);
    setStatus(Status.Loaded);
  }, [setProviders, connectPolkadotApi]);

  useEffect(() => {
    getStorageProviders();
  }, [getStorageProviders]);

  const NoProviders = () => {
    return (
      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
        <Server className="mx-auto h-12 w-12 text-gray-400 mb-2" />
        <p className="text-gray-500">No storage providers found</p>
        <p className="text-sm mt-2 text-gray-400">
          Run a storage provider node and register it on chain
        </p>
        <p className="text-xs mt-1 text-gray-400 font-mono">endpoint: {COLLATOR_RPC_URL}</p>
      </div>
    );
  };

  const Providers = () => {
    return Array.from(providers.entries()).map(([accountId, provider]) => (
      <li key={`${accountId}`} style={{ listStyleType: "none" }}>
        <ProviderButton
          accountId={accountId}
          provider={provider}
          isSelected={selectedProviders.has(accountId)}
          onSelect={onSelectProvider}
        />
      </li>
    ));
  };

  const Body = () => {
    switch (status) {
      case Status.Loading:
      case Status.Connecting: {
        return (
          <div className="text-center py-8">
            <Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-500 mb-4" />
            <p className="text-gray-600">Loading storage providers...</p>
          </div>
        );
      }
      case Status.Loaded:
      case Status.Connected: {
        return (
          <div className="grid gap-4">{providers.size === 0 ? <NoProviders /> : <Providers />}</div>
        );
      }

      case Status.Failed: {
        return (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        );
      }
    }
  };

  const RefreshStorageProviders = () => {
    return (
      <button
        type="submit"
        className="transition-colors hover:text-blue-400"
        onClick={getStorageProviders}
      >
        <RefreshCw />
      </button>
    );
  };

  return (
    <div className="grow">
      <div className="flex py-4">
        <h2 className="flex items-center text-lg font-semibold pr-2">Select Storage Provider</h2>
        <RefreshStorageProviders />
      </div>
      <Body />
    </div>
  );
}
