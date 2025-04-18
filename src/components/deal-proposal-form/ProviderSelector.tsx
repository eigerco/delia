import { hexToU8a } from "@polkadot/util";
import { base58Encode } from "@polkadot/util-crypto";
import { AlertCircle, Loader2, RefreshCw, Server } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type Control, Controller, type Path } from "react-hook-form";
import { useCtx } from "../../GlobalCtx";
import { COLLATOR_LOCAL_RPC_URL } from "../../lib/consts";
import { type StorageProviderInfo, isStorageProviderInfo } from "../../lib/storageProvider";
import { ProviderButton } from "../buttons/ProviderButton";
import type { IFormValues } from "./types";

type Status =
  | { type: "connecting" }
  | { type: "connected" }
  | { type: "loading" }
  | { type: "loaded" }
  | { type: "failed"; error: string };

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
  spInfo.accountId = key;
  spInfo.peerId = base58Encode(hexToU8a(spInfo.peerId));
  return spInfo;
};

type ProviderSelectorProps = {
  control: Control<IFormValues>;
  name: Path<IFormValues>;
  error?: string;
};

const NoProviders = () => {
  return (
    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
      <Server className="mx-auto h-12 w-12 text-gray-400 mb-2" />
      <p className="text-gray-500">No storage providers found</p>
      <p className="text-sm mt-2 text-gray-400">
        Run a storage provider node and register it on chain
      </p>
      <p className="text-xs mt-1 text-gray-400 font-mono">endpoint: {COLLATOR_LOCAL_RPC_URL}</p>
    </div>
  );
};

export function ProviderSelector({ control, name, error }: ProviderSelectorProps) {
  const [status, setStatus] = useState<Status>({ type: "connecting" });
  const [providers, setProviders] = useState<Map<string, StorageProviderInfo>>(new Map());
  const { collatorWsApi: polkaStorageApi } = useCtx();

  const getStorageProviders = useCallback(async () => {
    if (!polkaStorageApi) {
      return;
    }

    setStatus({ type: "loading" });
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
    setStatus({ type: "loaded" });
  }, [polkaStorageApi]);

  useEffect(() => {
    getStorageProviders();
  }, [getStorageProviders]);

  const Body = () => {
    switch (status.type) {
      case "loading":
      case "connecting": {
        return (
          <div className="text-center py-8">
            <Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-500 mb-4" />
            <p className="text-gray-600">Loading storage providers...</p>
          </div>
        );
      }
      case "loaded":
      case "connected": {
        return (
          <div className="grid gap-4">
            <Controller
              control={control}
              name={name}
              render={({ field }) => (
                <div className="min-w-md max-w-md">
                  {providers.size === 0 ? (
                    <NoProviders />
                  ) : (
                    Array.from(providers.entries()).map(([accountId, provider]) => {
                      // not sure if/how to make sure field is string[] at the type level
                      const v = (field.value as StorageProviderInfo[]) || [];
                      const isSelected = v.some((sp) => sp.peerId === provider.peerId);

                      return (
                        <li key={`${accountId}`} style={{ listStyleType: "none" }}>
                          <ProviderButton
                            accountId={accountId}
                            provider={provider}
                            isSelected={isSelected}
                            onSelect={(accountId) => {
                              const newValue = isSelected
                                ? v.filter((sp) => sp.accountId !== accountId)
                                : [...v, provider];
                              field.onChange(newValue);
                            }}
                          />
                        </li>
                      );
                    })
                  )}
                  {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                </div>
              )}
            />
          </div>
        );
      }

      case "failed": {
        return (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{status.error}</span>
          </div>
        );
      }
    }
  };

  return (
    <div>
      <div className="flex py-4">
        <h2 className="flex items-center text-lg font-semibold pr-2">Select Storage Provider</h2>
        <button
          type="button"
          className="transition-colors hover:text-blue-400"
          onClick={(_) => getStorageProviders()}
        >
          <RefreshCw />
        </button>
      </div>
      <Body />
    </div>
  );
}
