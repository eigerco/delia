import { ApiPromise, WsProvider } from "@polkadot/api";
import { hexToU8a } from "@polkadot/util";
import { base58Encode } from "@polkadot/util-crypto";
import { AlertCircle, Loader2, RefreshCw, Server } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ProviderButton } from "./buttons/ProviderButton";

const COLLATOR_RPC_URL = "ws://127.0.0.1:42069"; // TODO: replace with some mechanism like polkadot.js

enum Status {
  Connecting = 0,
  Connected = 1,
  Failed = 2,
}

type ProviderSelectorProps = {
  providers: Map<string, object>;
  setProviders: (providers: Map<string, object>) => void;
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

  // A liveness check before populating (or maybe populating but disabled)
  // would be great UX
  const getStorageProviders = async () => {
    setStatus(Status.Connecting);
    setError(null);
    setProviders(new Map());

    // This should be parametrizable
    const wsProvider = new WsProvider(COLLATOR_RPC_URL);
    try {
      console.log(`Connecting to ${COLLATOR_RPC_URL}`);
      const polkaStorageApi = await ApiPromise.create({
        provider: wsProvider,
      });

      const entries = await polkaStorageApi.query.storageProvider.storageProviders.entries();
      for (const [key, value] of entries) {
        const human = value.toHuman().info; // TODO: proper conversion
        if ("peerId" in human) {
          human.peerId = base58Encode(hexToU8a(human.peerId));
        }
        const newProviders = new Map(providers);
        // debugger;
        newProviders.set(key.args[0].toString(), human);
        setProviders(newProviders);
      }

      console.log(`Connected to ${await polkaStorageApi.rpc.system.chain()}`);
      apiPromiseRef.current = polkaStorageApi;
      setStatus(Status.Connected);
    } catch (error) {
      if (error && error instanceof Error) {
        setStatus(Status.Failed);
        setError(error.message);
      }
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: False positive, this is supposed to run ONCE
  useEffect(() => {
    getStorageProviders();
  }, []);

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
          onSelect={(accountId) => onSelectProvider(accountId)}
        />
      </li>
    ));
  };

  const Body = () => {
    switch (status) {
      case Status.Connecting: {
        return (
          <div className="text-center py-8">
            <Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-500 mb-4" />
            <p className="text-gray-600">Loading storage providers...</p>
          </div>
        );
      }
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
