import { CheckCircle2, Circle } from "lucide-react";
import type { StorageProviderInfo } from "../../lib/storageProvider";

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
      className={`flex max-w-md p-4 border rounded-lg transition-colors ${
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
          <div className="font-medium truncate max-w-md">{accountId}</div>
          <div className="text-sm text-gray-500">
            <span className="truncate">Peer Id: {peerId}</span>
            <br />
            <span>Sector Size: {provider.sectorSize} bytes</span>
          </div>
        </div>
      </div>
    </button>
  );
}
