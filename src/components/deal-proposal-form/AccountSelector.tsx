import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import type { Path, UseFormRegister } from "react-hook-form";
import type { FormValues } from "./types";

type HookAccountSelectorProps = {
  id: Path<FormValues>;
  register: UseFormRegister<FormValues>;
  accounts: InjectedAccountWithMeta[];
};

export const HookAccountSelector = ({ id, register, accounts }: HookAccountSelectorProps) => (
  <div>
    <select
      id={id}
      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      {...register(id)}
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
