import { type Control, Controller, type Path } from "react-hook-form";
import { useCtx } from "../../GlobalCtx";
import type { StorageProviderInfo } from "../../lib/storageProvider";
import type { FormValues } from "./types";

type ProviderSelectionTableProps = {
  providers: Map<string, StorageProviderInfo>;
  control: Control<FormValues>;
  name: Path<FormValues>;
  totalPrice: number;
};

export function ProviderSelectionTable({
  providers,
  control,
  name,
  totalPrice,
}: ProviderSelectionTableProps) {
  const { tokenProperties } = useCtx();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="max-w-full overflow-x-auto scroll-smooth">
          <table className="table-auto border-collapse w-full">
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
                    <td className="px-2 border">
                      <input type="checkbox" checked={isSelected} readOnly />
                    </td>
                    <td className="px-2 border text-sm  font-mono">{provider.sectorSize}</td>
                    <td className="px-2 border text-sm  whitespace-nowrap">
                      {tokenProperties.formatUnit(provider.dealParams.minimumPricePerBlock, true)}
                    </td>
                    <td className="px-2 w-3xs truncate border text-sm  font-mono ">{accountId}</td>
                    <td className="px-2 truncate border text-sm  font-mono">{provider.peerId}</td>
                  </tr>
                );
              })}
            </tbody>
            {totalPrice > 0 && (
              <tfoot>
                <tr>
                  <td />
                  <th className="text-right px-2">Total Price:</th>
                  <td className="px-2 border bg-blue-50">
                    {tokenProperties.formatUnit(totalPrice, true)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    />
  );
}
