import { RefreshCw, Server } from "lucide-react";
import { type Control, Controller, type FieldError, type Merge, type Path } from "react-hook-form";
import { COLLATOR_LOCAL_RPC_URL } from "../../lib/consts";
import type { StorageProviderInfo } from "../../lib/storageProvider";
import { ProviderButton } from "../buttons/ProviderButton";
import type { IFormValues } from "./types";

type ProviderSelectorProps = {
  providers: Map<string, StorageProviderInfo>;
  control: Control<IFormValues>;
  name: Path<IFormValues>;
  errors?: Merge<FieldError, (FieldError | undefined)[]>;
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

export function ProviderSelector({ providers, control, name, errors }: ProviderSelectorProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div>
          <div className="flex py-4">
            <h2 className="flex items-center text-lg font-semibold pr-2">
              Select Storage Provider
            </h2>
            <button
              type="button"
              className="transition-colors hover:text-blue-400"
              onClick={(_) => {}}
            >
              <RefreshCw />
            </button>
          </div>
          <div className="min-w-md max-w-md">
            {providers.size === 0 ? (
              <NoProviders />
            ) : (
              Array.from(providers.entries()).map(([accountId, provider]) => {
                // TODO: not sure how to make sure field is string[] at the type level
                const v = field.value as string[];
                const isSelected = v.includes(accountId);

                return (
                  <li key={`${accountId}`} style={{ listStyleType: "none" }}>
                    <ProviderButton
                      accountId={accountId}
                      provider={provider}
                      isSelected={v.includes(accountId)}
                      onSelect={(accountId) => {
                        const newValue = isSelected
                          ? v.filter((id) => id !== accountId)
                          : [...v, accountId];
                        field.onChange(newValue);
                      }}
                    />
                  </li>
                );
              })
            )}
            {errors && (
              <p className="mt-1 text-sm text-red-600">
                {errors.message?.toString() || "This field is required"}
              </p>
            )}
          </div>
        </div>
      )}
    />
  );
}
