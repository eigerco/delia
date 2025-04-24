import type { ApiPromise } from "@polkadot/api";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import type { AccountInfo } from "@polkadot/types/interfaces";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { useCtx } from "../GlobalCtx";
import { BalanceStatus } from "../components/Balance";
import { AccountDropdown } from "../components/account/AccountDropdown";
import { BalancePanel } from "../components/account/BalancePanel";
import { FaucetPanel } from "../components/account/FaucetPanel";

async function fetchBalancesFor(
  api: ApiPromise | null,
  account: InjectedAccountWithMeta,
  setWalletBalance: (status: BalanceStatus) => void,
  setMarketBalance: (status: BalanceStatus) => void,
  setLastUpdated: (d: Date) => void,
) {
  if (!api) return;

  try {
    setMarketBalance(BalanceStatus.loading());
    setWalletBalance(BalanceStatus.loading());

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
}

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
    (account: InjectedAccountWithMeta) => {
      void fetchBalancesFor(api, account, setWalletBalance, setMarketBalance, setLastUpdated);
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

      <FaucetPanel
        selectedAddress={selectedAddress}
        onSuccess={() => {
          const selected = accounts.find((a) => a.address === selectedAddress);
          if (selected) {
            void fetchBalances(selected);
          }
        }}
      />

      <BalancePanel
        selectedAddress={selectedAddress}
        walletBalance={walletBalance}
        marketBalance={marketBalance}
        lastUpdated={lastUpdated}
        onRefresh={() => {
          const acc = accounts.find((a) => a.address === selectedAddress);
          if (acc) fetchBalances(acc);
        }}
      />
    </div>
  );
}
