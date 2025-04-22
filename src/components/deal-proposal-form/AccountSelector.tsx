import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { HelpCircle } from "lucide-react";
import type { PropsWithChildren } from "react";
import type { Path, UseFormRegister } from "react-hook-form";
import { Tooltip } from "react-tooltip";
import type { FormValues } from "./types";

type HookAccountSelectorProps = {
  id: Path<FormValues>;
  register: UseFormRegister<FormValues>;
  accounts: InjectedAccountWithMeta[];
};

export const HookAccountSelector = ({
  id,
  register,
  accounts,
}: PropsWithChildren<HookAccountSelectorProps>) => (
  <div>
    <label
      htmlFor={id}
      className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
    >
      Client Account
      <span id="tooltip-account-selector" className="cursor-help inline-flex items-center ml-1">
        <HelpCircle className="inline w-4 h-4 text-gray-400" />
      </span>
      <Tooltip
        anchorSelect="#tooltip-account-selector"
        content="The blockchain account that will be associated with (and pay for) this storage deal"
      />
    </label>
    <select
      id={id}
      className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
