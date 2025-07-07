import { multiaddr } from "@multiformats/multiaddr";
import { hexToU8a } from "@polkadot/util";
import { AlertCircle, Loader2, RefreshCw, Server } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Control, Path } from "react-hook-form";
import { useCtx } from "../../GlobalCtx";
import type { DealParams, StorageProviderInfo } from "../../lib/storageProvider";
import { ProviderSelectionTable } from "./ProviderSelectionTable";
import type { FormValues } from "./types";

type Status =
  | { type: "connecting" }
  | { type: "connected" }
  | { type: "loading" }
  | { type: "loaded" }
  | { type: "failed"; error: string };

type ProviderSelectorProps = {
  control: Control<FormValues>;
  name: Path<FormValues>;
  error?: string;
  totalPrice: number;
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

export function ProviderSelector({ control, name, error, totalPrice }: ProviderSelectorProps) {
  const [status, setStatus] = useState<Status>({ type: "connecting" });
  const [providers, setProviders] = useState<Map<string, StorageProviderInfo>>(new Map());
  const { papiTypedApi } = useCtx();

  const getStorageProviders = useCallback(async () => {
    if (!papiTypedApi) {
      return;
    }

    setStatus({ type: "loading" });

    const newProviders = new Map<string, StorageProviderInfo>();
    const papiEntries = await papiTypedApi.query.StorageProvider.StorageProviders.getEntries();
    for (const entry of papiEntries) {
      const accountId = entry.keyArgs[0].toString();
      const value = entry.value;
      const spInfo: StorageProviderInfo = {
        accountId,
        multiaddr: multiaddr(hexToU8a(value.info.multiaddr.asHex())),
        sectorSize: value.info.sector_size.type,
        windowPostPartitionSectors: value.info.window_post_partition_sectors.toString(),
        windowPostProofType: value.info.window_post_proof_type.type,
        dealParams: {
          minimumPricePerBlock: 0,
          dealDuration: {
            lower: 0,
            upper: 0,
          },
        },
      };
      newProviders.set(accountId, spInfo);
    }

    const params = await papiTypedApi.query.StorageProvider.SPDealParameters.getEntries();
    for (const param of params) {
      const providerId = param.keyArgs[0].toString();
      const value = param.value;
      const dealParams: DealParams = {
        minimumPricePerBlock: Number(value.minimum_price_per_block),
        dealDuration: value.deal_duration,
      };
      const spInfo = newProviders.get(providerId);
      if (!spInfo) {
        console.warn("Cannot associate deal params with SP", providerId, dealParams);
        continue;
      }
      spInfo.dealParams = dealParams;
    }

    // Remove providers without deal parameters
    for (const [providerId, spInfo] of newProviders.entries()) {
      if (!spInfo.dealParams) {
        console.warn("Provider has no deal parameters, removing from list", providerId);
        newProviders.delete(providerId);
      }
    }

    setProviders(newProviders);
    setStatus({ type: "loaded" });
  }, [papiTypedApi]);

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
            <div className="w-full">
              {providers.size === 0 ? (
                <NoProviders />
              ) : (
                <ProviderSelectionTable
                  providers={providers}
                  control={control}
                  name={name}
                  totalPrice={totalPrice}
                />
              )}
              {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            </div>
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
