import { CheckCircle2, Circle, HelpCircle } from "lucide-react";
import { Tooltip } from "react-tooltip";
import { useCtx } from "../../GlobalCtx";
import type { StorageProviderInfo } from "../../lib/storageProvider";

type ProviderButtonProps = {
  accountId: string;
  provider: StorageProviderInfo;
  isSelected: boolean;
  onSelect: (accountId: string) => void;
};

export function ProviderButton({ accountId, provider, isSelected, onSelect }: ProviderButtonProps) {
  const { tokenProperties } = useCtx();
  const peerId = provider.peerId;
  return (
    <button
      type="button"
      onClick={() => onSelect(accountId)}
      className={`w-full p-4 border rounded-lg transition-colors ${
        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
      }`}
    >
      {/* TODO: This should probably check connectivity */}
      <div className="flex items-center gap-3 w-full">
        {isSelected ? (
          <CheckCircle2 className="text-blue-500" />
        ) : (
          <Circle className="text-gray-500" />
        )}
        <div className="text-left w-full">
          <div className="relative">
            <div
              id={`account-id-tooltip-${accountId}`}
              className="font-medium truncate overflow-hidden text-ellipsis cursor-help"
            >
              {accountId}
            </div>
            <Tooltip anchorSelect={`#account-id-tooltip-${accountId}`} content={accountId} />
          </div>

          <div className="flex flex-col text-sm text-gray-500">
            <span
              id={`peer-id-tooltip-${accountId}`}
              className="truncate overflow-hidden text-ellipsis cursor-help"
            >
              Peer Id: {peerId}
            </span>
            <Tooltip anchorSelect={`#peer-id-tooltip-${accountId}`} content={peerId} />

            <span>
              Sector Size: {provider.sectorSize} bytes
              <span id="tooltip-sector-size" className="cursor-help inline-flex items-center ml-1">
                <HelpCircle className="inline w-4 h-4 text-gray-400" />
              </span>
              <Tooltip
                anchorSelect="#tooltip-sector-size"
                content="Maximum amount of data that can be stored in a single sector by this provider"
              />
            </span>

            <span>
              Price Per Block:{" "}
              {tokenProperties.formatUnit(
                tokenProperties.planckToUnit(provider.dealParams.minimumPricePerBlock),
                true,
              )}
              <span id="tooltip-price" className="cursor-help inline-flex items-center ml-1">
                <HelpCircle className="inline w-4 h-4 text-gray-400" />
              </span>
              <Tooltip
                anchorSelect="#tooltip-price"
                content="Price for data storage for 1 block (~6s)"
              />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
