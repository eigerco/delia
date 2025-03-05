import { CheckCircle2, Circle } from "lucide-react";

type ProviderButtonProps = {
  accountId: string;
  provider: object; // TODO: replace the object with a better type
  isSelected: boolean;
  onSelect: (accountId: string) => void;
};

export function ProviderButton({
  accountId,
  provider,
  isSelected,
  onSelect,
}: ProviderButtonProps) {
  const peerId = provider.peerId;

  return (
    <div className="flex">
      <button
        type="button"
        onClick={() => onSelect(accountId)}
        className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
          isSelected
            ? "border-blue-500 bg-blue-50"
            : "border-gray-200 hover:border-blue-300"
        }`}
      >
        {/* This should probably check connectivity */}
        <div className="flex items-center gap-3">
          {isSelected ? (
            <CheckCircle2 className="text-blue-500" />
          ) : (
            <Circle className="text-gray-500" />
          )}
          <div className="text-left">
            <div className="font-medium truncate max-w-md">{accountId}</div>
            <div className="text-sm text-gray-500">
              <span>Peer Id: {peerId}</span>
              <br />
              <span>Sector Size: {provider.sectorSize} bytes</span>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
