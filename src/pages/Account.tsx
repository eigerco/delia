import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import type { AccountInfo } from "@polkadot/types/interfaces";
import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { Tooltip } from "react-tooltip";
import { useCtx } from "../GlobalCtx";
import { Balance, BalanceStatus } from "../components/Balance";
import { getRelativeTime } from "../lib/time";

export namespace FaucetStatus {
  export function idle(): FaucetStatus {
    return { state: FaucetState.Idle };
  }
  export function loading(): FaucetStatus {
    return { state: FaucetState.Loading };
  }
  export function success(txHash: string): FaucetStatus {
    return { state: FaucetState.Success, txHash };
  }
  export function error(message: string): FaucetStatus {
    return { state: FaucetState.Error, message };
  }
}

export enum FaucetState {
  Idle = "idle",
  Loading = "loading",
  Success = "success",
  Error = "error",
}

export type FaucetStatus =
  | { state: FaucetState.Idle }
  | { state: FaucetState.Loading }
  | { state: FaucetState.Success; txHash: string }
  | { state: FaucetState.Error; message: string };

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
  const [faucetStatus, setFaucetStatus] = useState<FaucetStatus>(FaucetStatus.idle);

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

      {selectedAddress && (
        <div className="border rounded p-4 bg-gray-50 space-y-3 w-full">
          <h3 className="text-lg font-semibold">💧 Faucet Top-Up</h3>
          <p className="text-sm text-gray-600">
            Use this to request testnet funds from the faucet. No signature is required.
          </p>

          <button
            type="button"
            disabled={faucetStatus.state === FaucetState.Loading}
            className={`px-3 py-2 rounded text-sm transition ${
              faucetStatus.state === FaucetState.Loading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            onClick={async () => {
              if (!api || !selectedAddress) return;

              try {
                setFaucetStatus(FaucetStatus.loading);

                const unsub = await api.tx.faucet.drip(selectedAddress).send((result) => {
                  const { status, dispatchError } = result;

                  // Check if transaction is included in block
                  if (status.isInBlock || status.isFinalized) {
                    if (dispatchError) {
                      if (dispatchError.isModule) {
                        const decoded = api.registry.findMetaError(dispatchError.asModule);
                        const { docs, name, section } = decoded;

                        const userMessage =
                          section === "faucet" && name === "FaucetUsedRecently"
                            ? "You can only request tokens once every 24 hours."
                            : docs.join(" ") || "Transaction failed.";

                        setFaucetStatus(FaucetStatus.error(userMessage));
                        setTimeout(() => setFaucetStatus(FaucetStatus.idle), 4000);
                      } else {
                        setFaucetStatus(FaucetStatus.error(dispatchError.toString()));
                        setTimeout(() => setFaucetStatus(FaucetStatus.idle), 4000);
                      }
                    } else {
                      setFaucetStatus(FaucetStatus.success(result.txHash.toHex()));
                      const selected = accounts.find((a) => a.address === selectedAddress);
                      if (selected) {
                        void fetchBalances(selected);
                      }
                    }

                    unsub();
                  }
                });
              } catch (err) {
                const rawMessage = (err as Error).message || "";
                const isDuplicate =
                  rawMessage.includes("1013") ||
                  rawMessage.includes("Transaction Already Imported");

                const userMessage = isDuplicate
                  ? "Your transaction is already being processed."
                  : "Transaction failed.";

                setFaucetStatus(FaucetStatus.error(userMessage));
                setTimeout(() => setFaucetStatus(FaucetStatus.idle), 4000);
              }
            }}
          >
            {faucetStatus.state === FaucetState.Loading
              ? "⏳ Requesting..."
              : "💰 Request 10 Test Tokens"}
          </button>
          {faucetStatus.state === FaucetState.Success && (
            <div className="text-sm text-green-600 space-y-1">
              <p>✅ Faucet top-up successful!</p>
              <p>Tx Hash: {faucetStatus.txHash}</p>
            </div>
          )}
          {faucetStatus.state === FaucetState.Error && (
            <p className="text-sm text-red-600">⚠️ {faucetStatus.message}</p>
          )}
        </div>
      )}

      {selectedAddress && (
        <div className="border rounded p-4 bg-gray-50 space-y-3">
          <h3 className="text-lg font-semibold">💼 Wallet Balances</h3>

          <Balance status={walletBalance} balanceType="Wallet" />
          <Balance status={marketBalance} balanceType="Market" />

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
        </div>
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
