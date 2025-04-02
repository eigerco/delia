import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { GlobalCtxProvider } from "./GlobalCtxProvider";
import { ConnectWallet } from "./components/ConnectWallet";
import { COLLATOR_LOCAL_RPC_URL } from "./lib/consts";
import { setupTypeRegistry } from "./lib/registry";

const DEAL_CREATION_PATH = "/";
const DOWNLOAD_PATH = "/download";

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
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [wsAddress, setWsAddress] = useState(COLLATOR_LOCAL_RPC_URL);

  const location = useLocation();
  const registry = useMemo(() => setupTypeRegistry(), []);

  return (
    <GlobalCtxProvider registry={registry} wsAddress={wsAddress}>
      <div className="m-8">
        <div className="flex mb-4 items-center">
          <h1 className="grow text-xl font-bold">📦 Delia</h1>
          <div className="flex items-center mr-6">
            {location.pathname === DEAL_CREATION_PATH ? (
              <></>
            ) : (
              <Link to="/" className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-sm">
                Deal Creation
              </Link>
            )}
            {location.pathname === DOWNLOAD_PATH ? (
              <></>
            ) : (
              <Link to="/download" className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded-sm">
                Download
              </Link>
            )}
          </div>
          <WsAddressInput onChange={setWsAddress} />
        </div>
        {accounts.length === 0 ? (
          <ConnectWallet onConnect={setAccounts} />
        ) : (
          <Outlet context={{ accounts, selectedAccount, setSelectedAccount }} />
        )}
      </div>
    </GlobalCtxProvider>
  );
}

export default App;
