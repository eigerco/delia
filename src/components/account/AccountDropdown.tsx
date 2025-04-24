import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

type AccountDropdownProps = {
  accounts: InjectedAccountWithMeta[];
  selectedAddress: string;
  onChange: (address: string) => void;
};

export function AccountDropdown({ accounts, selectedAddress, onChange }: AccountDropdownProps) {
  return (
    <div>
      <label htmlFor="account-select" className="block text-sm font-medium text-gray-700 mb-1">
        Select Account
      </label>
      <select
        id="account-select"
        value={selectedAddress}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <option value="" disabled>
          Select an account
        </option>
        {accounts.map((account) => (
          <option key={account.address} value={account.address}>
            {account.meta.name} ({account.address.slice(0, 8)}...
            {account.address.slice(-8)})
          </option>
        ))}
      </select>
    </div>
  );
}
