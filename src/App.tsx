import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useMemo, useRef, useState } from "react";
import { GlobalCtxProvider } from "./GlobalCtxProvider";
import { ConnectWallet } from "./components/ConnectWallet";
import { setupTypeRegistry } from "./lib/registry";
import AccountSelector from "./pages/AccountSelector";
import { DealPreparation } from "./pages/DealPreparation";

enum FlowStatus {
  AccountSelection = 0,
  DealPreparation = 1,
}

function App() {
  const [flowStatus, setFlowStatus] = useState(FlowStatus.AccountSelection);

  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);

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
        <div className="flex pb-4 items-center">
          <h1 className="grow text-xl font-bold">📦 Delia</h1>
        </div>
        <Flow />
      </div>
    </GlobalCtxProvider>
  );
}

export default App;
