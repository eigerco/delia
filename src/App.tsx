import { useMemo, useState } from "react";
import { ConnectWallet } from "./components/ConnectWallet";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import AccountSelector from "./pages/AccountSelector";
import { DealPreparation } from "./pages/DealPreparation";
import { TypeRegistry } from "@polkadot/types";
import { GlobalCtxProvider } from "./GlobalCtxProvider";

enum FlowStatus {
  AccountSelection = 0,
  DealPreparation = 1,
}

function setupTypeRegistry(): TypeRegistry {
  const registry = new TypeRegistry();
  registry.register({
    DealState: {
      _enum: {
        Published: null,
        Active: "u64",
      },
    },
    DealProposal: {
      piece_cid: "Bytes",
      piece_size: "u64",
      client: "AccountId",
      provider: "AccountId",
      label: "Bytes",
      start_block: "u64",
      end_block: "u64",
      storage_price_per_block: "u128",
      provider_collateral: "u128",
      state: "DealState",
    },
  });
  return registry;
}

function App() {
  const [flowStatus, setFlowStatus] = useState(FlowStatus.AccountSelection);

  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] =
    useState<InjectedAccountWithMeta | null>(null);

  const AccountSelection = () => {
    return (
      <>
        {accounts.length > 0 ? (
          <AccountSelector
            accounts={accounts}
            selectedAccount={selectedAccount}
            onSelectAccount={setSelectedAccount}
            onContinue={() => {
              setFlowStatus(FlowStatus.DealPreparation);
            }}
          />
        ) : (
          <ConnectWallet onConnect={setAccounts} />
        )}
      </>
    );
  };

  const Flow = () => {
    switch (flowStatus) {
      case FlowStatus.AccountSelection: {
        return <AccountSelection />;
      }
      case FlowStatus.DealPreparation: {
        if (!selectedAccount) {
          throw new Error(`Selected account cannot be ${selectedAccount}`);
        }
        return <DealPreparation account={selectedAccount} />;
      }
    }
  };

  const registry = useMemo(() => setupTypeRegistry(), []);

  return (
    <GlobalCtxProvider registry={registry}>
      <div className="m-8">
        <Flow />
      </div>
    </GlobalCtxProvider>
  );
}

export default App;
