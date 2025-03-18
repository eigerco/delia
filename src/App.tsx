import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { GlobalCtxProvider } from "./GlobalCtxProvider";
import { ConnectWallet } from "./components/ConnectWallet";
import { COLLATOR_LOCAL_RPC_URL } from "./lib/consts";
import { setupTypeRegistry } from "./lib/registry";
import AccountSelector from "./pages/AccountSelector";
import { DealPreparation } from "./pages/DealPreparation";
import { Download } from "./pages/Download";

enum FlowStatus {
  AccountSelection = 0,
  DealPreparation = 1,
  Download = 2,
}

// TODO: this component should be red if it fails to connect
function WsAddressInput({ onChange }: { onChange: (newValue: string) => void }) {
  const [wsAddress, setWsAddress] = useState(COLLATOR_LOCAL_RPC_URL);
  return (
    <>
      <label htmlFor="ws-address" className="text-gray-700 mr-2">
        Address
      </label>
      <input
        id="ws-address"
        type="text"
        className="p-1 border rounded  focus:ring-blue-500 focus:border-blue-500 mr-2"
        value={wsAddress}
        onChange={(e) => setWsAddress(e.target.value)}
      />
      <button
        type="submit"
        className="transition-colors hover:text-blue-400"
        onClick={(_) => {
          onChange(wsAddress);
        }}
      >
        <RefreshCw />
      </button>
    </>
  );
}

function App() {
  const [flowStatus, setFlowStatus] = useState(FlowStatus.AccountSelection);

  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [wsAddress, setWsAddress] = useState(COLLATOR_LOCAL_RPC_URL);

  const AccountSelection = () => {
    return (
      <>
        {accounts.length > 0 ? (
          <>
            <AccountSelector
              accounts={accounts}
              selectedAccount={selectedAccount}
              onSelectAccount={setSelectedAccount}
              onContinue={() => {
                setFlowStatus(FlowStatus.DealPreparation);
              }}
            />
            <div className="flex justify-left mt-4">
              <button
                onClick={() => setFlowStatus(FlowStatus.Download)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-sm"
              >
                Download Files
              </button>
            </div>
          </>
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
      case FlowStatus.Download: {
        return <Download />;
      }
    }
  };

  const registry = useMemo(() => setupTypeRegistry(), []);

  return (
    <GlobalCtxProvider registry={registry} wsAddress={wsAddress}>
      <div className="m-8">
        <div className="flex mb-4 items-center">
          <h1 className="grow text-xl font-bold">📦 Delia</h1>
          <WsAddressInput onChange={setWsAddress} />
        </div>
        <Flow />
      </div>
    </GlobalCtxProvider>
  );
}

export default App;
