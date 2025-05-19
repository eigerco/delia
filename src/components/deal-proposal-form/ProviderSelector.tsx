import { hexToU8a } from "@polkadot/util";
import { base58Encode } from "@polkadot/util-crypto";
import { AlertCircle, Loader2, RefreshCw, Server } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type Control, Controller, type Path } from "react-hook-form";
import { useCtx } from "../../GlobalCtx";
import {
  type DealParams,
  type StorageProviderInfo,
  isStorageProviderInfo,
} from "../../lib/storageProvider";
import type { FormValues } from "./types";

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
  spInfo.sectorSize = spInfo.sectorSize.replace("_", "");
  return spInfo;
};

type ProviderSelectorProps = {
  control: Control<FormValues>;
  name: Path<FormValues>;
  error?: string;
};

const NoProviders = () => {
  const { wsAddress } = useCtx();
  return (
    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
      <Server className="mx-auto h-12 w-12 text-gray-400 mb-2" />
      <p className="text-gray-500">No storage providers found</p>
      <p className="text-sm mt-2 text-gray-400">
        Run a storage provider node and register it on chain
      </p>
      <p className="text-xs mt-1 text-gray-400 font-mono">endpoint: {wsAddress}</p>
    </div>
  );
};

export function ProviderSelector({ control, name, error }: ProviderSelectorProps) {
  const [status, setStatus] = useState<Status>({ type: "connecting" });
  const [providers, setProviders] = useState<Map<string, StorageProviderInfo>>(new Map());
  const { collatorWsApi: polkaStorageApi, tokenProperties } = useCtx();

  const getStorageProviders = useCallback(async () => {
    if (!polkaStorageApi) {
      return;
    }

    setStatus({ type: "loading" });

    const newProviders = new Map<string, StorageProviderInfo>();
    const entries = await polkaStorageApi.query.storageProvider.storageProviders.entries();
    for (const [key, value] of entries) {
      const accountId = key.args[0].toString();
      // biome-ignore lint/suspicious/noExplicitAny: any is a superset of AnyJson and easier to work with
      const spInfo = anyJsonToSpInfo(accountId, value.toJSON() as any);
      if (typeof spInfo === "string") {
        console.warn(spInfo);
        continue;
      }

      newProviders.set(key.args[0].toString(), spInfo);
    }

    const params = await polkaStorageApi.query.market.spDealParameters.entries();
    for (const [key, value] of params) {
      const providerId = key.args[0].toString();
      const dealParams = value.toJSON() as unknown as DealParams;
      const spInfo = newProviders.get(providerId);
      if (!spInfo) {
        console.warn("Cannot associate deal params with SP", providerId, dealParams);
        continue;
      }
      spInfo.dealParams = dealParams;
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
          <div className="grid grid-cols-1 gap-4 w-full">
            <Controller
              control={control}
              name={name}
              render={({ field }) => (
                <div className="w-full">
                  {providers.size === 0 ? (
                    <NoProviders />
                  ) : (
                    <div className="flex flex-col">
                      <div className="max-w-full overflow-x-auto scroll-smooth">
                        <table className="table-auto font-normal border border-collapse w-full">
                          <thead>
                            <tr>
                              <th className="border" />
                              <th className="border whitespace-nowrap px-2">Sector Size</th>
                              <th className="border whitespace-nowrap px-2">Price per Block</th>
                              <th className="border whitespace-nowrap px-2">Account ID</th>
                              <th className="border whitespace-nowrap px-2">Peer ID</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from(providers.entries()).map(([accountId, provider]) => {
                              // as StorageProviderInfo[], because I can't figure out how to enforce that FormValues[name] passed here will be `StorageProviderInfo[]` typed at typescript level.
                              const v = (field.value as StorageProviderInfo[]) || [];
                              const isSelected = v.some((sp) => sp.peerId === provider.peerId);

                              return (
                                // biome-ignore lint/a11y/useKeyWithClickEvents: TODO
                                <tr
                                  className="cursor-pointer hover:bg-blue-50"
                                  key={`${accountId}`}
                                  onClick={(_) => {
                                    const newValue = isSelected
                                      ? v.filter((sp) => sp.accountId !== accountId)
                                      : [...v, provider];
                                    field.onChange(newValue);
                                  }}
                                >
                                  <th className="px-2 border">
                                    <input type="checkbox" checked={isSelected} readOnly />
                                  </th>
                                  <th className="px-2 border text-sm font-normal font-mono">
                                    {provider.sectorSize}
                                  </th>
                                  <th className="px-2 border text-sm font-normal whitespace-nowrap">
                                    {tokenProperties.formatUnit(
                                      tokenProperties.planckToUnit(
                                        provider.dealParams.minimumPricePerBlock,
                                      ),
                                      true,
                                    )}
                                  </th>
                                  <th className="px-2 w-3xs truncate border text-sm font-normal font-mono ">
                                    {accountId}
                                  </th>
                                  <th className="px-2 truncate border text-sm font-normal font-mono">
                                    {provider.peerId}
                                  </th>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
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
    <div className="pb-4">
      <div className="flex gap-2 pb-2">
        <p className="flex items-center">Select Storage Provider</p>
        <button
          type="button"
          className="transition-colors hover:text-blue-400"
          onClick={(_) => getStorageProviders()}
        >
          <RefreshCw width={16} />
        </button>
      </div>
      <Body />
    </div>
  );
}
