import type { ApiPromise } from "@polkadot/api";
import { web3FromSource } from "@polkadot/extension-dapp";
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
  setLastUpdated: (d: Date) => void,
) {
  if (!api) return;

  try {
    setWalletBalance(BalanceStatus.loading());

    const accountInfo = await api.query.system.account(account.address);
    const { data } = accountInfo as AccountInfo;
    const freeBalance: bigint = data.free.toBigInt();
    setWalletBalance(BalanceStatus.fetched(freeBalance));

    setLastUpdated(new Date());
  } catch (err) {
    console.error("Failed to fetch balances", err);
    setWalletBalance(BalanceStatus.error("Failed to fetch wallet balance"));
  }
}

export function Account() {
  const context = useOutletContext<{
    accounts: InjectedAccountWithMeta[];
  }>();

  const { accounts } = context;
  const { collatorWsApi: api } = useCtx();

  const [selectedAddress, setSelectedAddress] = useState(accounts[0].address);
  const [walletBalance, setWalletBalance] = useState(BalanceStatus.idle);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchBalances = useCallback(
    (account: InjectedAccountWithMeta) => {
      void fetchBalancesFor(api, account, setWalletBalance, setLastUpdated);
    },
    [api],
  );

  useEffect(() => {
    const account = accounts.find((acc) => acc.address === selectedAddress) ?? null;
    if (account?.address) {
      setSelectedAddress(account?.address);
    }
    if (account) {
      fetchBalances(account);
    }
    const setSigner = async () => {
      if (!api || !selectedAddress) return;

      const account = accounts.find((acc) => acc.address === selectedAddress);
      if (!account) return;

      const injector = await web3FromSource(account.meta.source);

      api.setSigner(injector.signer);
    };

    void setSigner();
  }, [accounts, selectedAddress, fetchBalances, api]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">🏛️ Account Info</h2>
      <AccountDropdown
        accounts={accounts}
        selectedAddress={selectedAddress}
        onChange={setSelectedAddress}
      />

      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1">
          <BalancePanel
            selectedAddress={selectedAddress}
            walletBalance={walletBalance}
            lastUpdated={lastUpdated}
            onRefresh={() => {
              const acc = accounts.find((a) => a.address === selectedAddress);
              if (acc) fetchBalances(acc);
            }}
          />
        </div>
        <div className="flex-1">
          <FaucetPanel
            selectedAddress={selectedAddress}
            onSuccess={() => {
              const selected = accounts.find((a) => a.address === selectedAddress);
              if (selected) {
                void fetchBalances(selected);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
