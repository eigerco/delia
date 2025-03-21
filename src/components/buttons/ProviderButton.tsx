import { CheckCircle2, Circle, HelpCircle } from "lucide-react";
import type { StorageProviderInfo } from "../../lib/storageProvider";
import { Tooltip } from "react-tooltip";

type ProviderButtonProps = {
  accountId: string;
  provider: StorageProviderInfo;
  isSelected: boolean;
  onSelect: (accountId: string) => void;
};

export function ProviderButton({ accountId, provider, isSelected, onSelect }: ProviderButtonProps) {
  const peerId = provider.peerId;

  return (
    <button
      type="button"
      onClick={() => onSelect(accountId)}
      className={`p-4 border rounded-lg transition-colors ${
        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
      }`}
    >
      {/* TODO: This should probably check connectivity */}
      <div className="flex items-center gap-3">
        {isSelected ? (
          <CheckCircle2 className="text-blue-500" />
        ) : (
          <Circle className="text-gray-500" />
        )}
        <div className="text-left max-w-md">
          <div className="font-medium truncate">{accountId}</div>
          <div className="flex flex-col text-sm text-gray-500">
            <span className="truncate">
              Peer Id: {peerId}
              <span id="tooltip-peer-id" className="cursor-help inline-flex items-center ml-1">
                <HelpCircle className="inline w-4 h-4 text-gray-400" />
              </span>
              <Tooltip anchorSelect="#tooltip-peer-id" content="Unique identifier for the storage provider in the peer-to-peer network" />
            </span>
            <span>
              Sector Size: {provider.sectorSize} bytes
              <span id="tooltip-sector-size" className="cursor-help inline-flex items-center ml-1">
                <HelpCircle className="inline w-4 h-4 text-gray-400" />
              </span>
              <Tooltip anchorSelect="#tooltip-sector-size" content="Maximum amount of data that can be stored in a single sector by this provider" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
