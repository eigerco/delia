import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import type { AccountInfo } from "@polkadot/types/interfaces";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { Tooltip } from "react-tooltip";
import { useCtx } from "../GlobalCtx";
import { Balance, BalanceStatus } from "../components/Balance";
import { getRelativeTime } from "../lib/time";

export function Account() {
  const context = useOutletContext<{
    accounts: InjectedAccountWithMeta[];
    setSelectedAccount: (acc: InjectedAccountWithMeta | null) => void;
  }>();

  const { accounts, setSelectedAccount } = context;
  const { collatorWsApi: api } = useCtx();

  const [selectedAddress, setSelectedAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState<BalanceStatus>(BalanceStatus.idle);
  const [marketBalance, setMarketBalance] = useState<BalanceStatus>(BalanceStatus.idle);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchBalances = useCallback(
    async (account: InjectedAccountWithMeta) => {
      if (!api) return;

      try {
        setMarketBalance(BalanceStatus.loading);
        setWalletBalance(BalanceStatus.loading);

        const accountInfo = await api.query.system.account(account.address);
        const { data } = accountInfo as AccountInfo;
        setWalletBalance(BalanceStatus.fetched(data.free.toNumber()));

        const result = await api.query.market.balanceTable(account.address);
        const marketJSON = result.toJSON() as Record<string, unknown>;
        const marketValue = (marketJSON.free as number) ?? 0;
        setMarketBalance(BalanceStatus.fetched(marketValue));
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Failed to fetch balances", err);
        setWalletBalance(BalanceStatus.error("Failed to fetch wallet balance"));
        setMarketBalance(BalanceStatus.error("Failed to fetch market balance"));
      }
    },
    [api],
  );

  useEffect(() => {
    let account = accounts.find((acc) => acc.address === selectedAddress) ?? null;

    if (accounts.length > 0 && selectedAddress === "") {
      account = accounts[0];
      setSelectedAddress(account.address);
      return;
    }

    setSelectedAccount(account);
    if (account) {
      fetchBalances(account);
    }
  }, [accounts, selectedAddress, setSelectedAccount, fetchBalances]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">🏛️ Account Info</h2>

      <AccountDropdown
        accounts={accounts}
        selectedAddress={selectedAddress}
        onChange={setSelectedAddress}
      />

      <Balance status={walletBalance} balanceType="Wallet" />
      <Balance status={marketBalance} balanceType="Market" />

      {selectedAddress && (
        <button
          id="refresh-balances-btn"
          type="button"
          onClick={() => {
            const acc = accounts.find((a) => a.address === selectedAddress);
            if (acc) fetchBalances(acc);
          }}
          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm transition"
        >
          🔄 Refresh Balances
        </button>
      )}

      {lastUpdated && (
        <Tooltip
          anchorSelect="#refresh-balances-btn"
          content={`Last updated ${getRelativeTime(lastUpdated)}`}
          place="right"
        />
      )}
    </div>
  );
}

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
