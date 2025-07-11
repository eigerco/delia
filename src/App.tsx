import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { default as initWasm } from "wasm-commp";
import { useCtx } from "./GlobalCtx";
import { GlobalCtxProvider } from "./GlobalCtxProvider";
import { ConnectWallet } from "./components/ConnectWallet";
import Toaster from "./components/Toaster";
import { WsAddressInput } from "./components/WsAddressInput";
import { DOWNLOAD_PATH, INDEX_PATH } from "./lib/consts";
import { setupTypeRegistry } from "./lib/registry";

function App() {
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [loaded, setLoaded] = useState<boolean>(false);

  const location = useLocation();

  const registry = useMemo(() => setupTypeRegistry(), []);

  // Initialize WASM module, !VERY IMPORTANT! without this no WASM function will work.
  useEffect(() => {
    initWasm()
      .then(() => {
        console.log("WASM module initialized");
        setLoaded(true);
      })
      .catch((err) => {
        console.error("Failed to initialize WASM module", err);
      });
  }, []);

  if (!loaded)
    return (
      <div className="text-center py-8">
        <Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-500 mb-4" />
        <p className="text-gray-600">Initializing WASM...</p>
      </div>
    );

  return (
    <GlobalCtxProvider registry={registry}>
      <div className="m-8">
        <div className="flex mb-4 items-center">
          <h1 className="grow text-xl font-bold">📦 Delia</h1>
          <div className="relative mr-6">
            {location.pathname === "/" ? (
              <Link
                to={DOWNLOAD_PATH}
                role="menuitem"
                className="flex items-center gap-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 whitespace-nowrap rounded"
              >
                Retrieval
              </Link>
            ) : location.pathname === "/download" ? (
              <Link
                to={INDEX_PATH}
                role="menuitem"
                className="flex items-center gap-2 px-3 py-1 bg-gray-200 hover:bg-gray-300 whitespace-nowrap rounded"
              >
                Home
              </Link>
            ) : null}
          </div>
          <WsAddressInput />
        </div>
        {accounts.length === 0 ? (
          <ConnectWallet onConnect={setAccounts} />
        ) : (
          <Inner context={{ accounts, selectedAccount, setSelectedAccount }} />
        )}
      </div>
      <Toaster />
    </GlobalCtxProvider>
  );
}

const Inner = ({ context }: { context: unknown }) => {
  const { collatorConnectionStatus, wsAddress } = useCtx();

  switch (collatorConnectionStatus.type) {
    case "loading":
    case "connecting": {
      return (
        <div className="text-center py-8">
          <Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-500 mb-4" />
          <p className="text-gray-600">Connecting to the collator at: {wsAddress}...</p>
        </div>
      );
    }
    case "disconnected": {
      return (
        <div className="bg-orange-50 text-center py-8 rounded-lg">
          <Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-500 mb-4" />
          <p className="text-gray-600">Reconnecting to the collator at: {wsAddress}...</p>
        </div>
      );
    }
    case "loaded":
    case "connected": {
      return <Outlet context={context} />;
    }

    case "failed": {
      return (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{collatorConnectionStatus.error}</span>
        </div>
      );
    }
  }
};

export default App;
