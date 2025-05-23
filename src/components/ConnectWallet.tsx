import { web3AccountsSubscribe, web3Enable } from "@polkadot/extension-dapp";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import { RefreshButton } from "./buttons/RefreshButton";

enum ConnectionStatus {
  Connecting = 0,
  Connected = 1,
  Failed = 2,
}

export function ConnectWallet({
  onConnect,
}: {
  onConnect: (accounts: InjectedAccountWithMeta[]) => void;
}) {
  const [status, setStatus] = useState(ConnectionStatus.Connecting);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const connectWallet = async () => {
      const extensions = await web3Enable("Delia");
      if (extensions.length === 0) {
        setError("No extension found, please install the Polkadot.js extension");
        setStatus(ConnectionStatus.Failed);
        return;
      }

      web3AccountsSubscribe((accounts) => {
        if (accounts.length === 0) {
          setError("No accounts found. Please create an account in your Polkadot.js extension");
          setStatus(ConnectionStatus.Failed);
          return;
        }

        onConnect(accounts);
        setStatus(ConnectionStatus.Connected);
      });
    };

    connectWallet();
  }, [onConnect]);

  switch (status) {
    case ConnectionStatus.Connecting: {
      return (
        <div className="items-center py-8">
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p>Connecting to Polkadot.js extension...</p>
          <p className="text-sm text-gray-500 mt-2">
            Please accept the connection request in the extension
          </p>
        </div>
      );
    }
    case ConnectionStatus.Connected: {
      return (
        <div className="text-center py-8">
          <p className="text-sm text-gray-500 mt-2">Connected</p>
        </div>
      );
    }
    case ConnectionStatus.Failed: {
      return (
        <div className="text-center py-8">
          <div className="flex flex-col gap-2 mb-4 p-4 bg-red-50 text-red-700 rounded-lg">
            <p className="font-medium">Connection Failed</p>

            <p className="text-sm">Error message: {error}</p>

            <div>
              <p className="text-sm font-bold">Troubleshooting:</p>
              <div className="flex justify-center">
                <ul className="text-left text-sm list-decimal list-inside">
                  <li>Ensure the Polkadot.js extension is installed and enabled</li>
                  <li>Open the Polkadot extension</li>
                  <li>Click on "Connect Accounts"</li>
                  <li>Select the accounts you want to enable for Polka Storage</li>
                  <li>Confirm your selection by clicking on "Connect X accounts"</li>
                </ul>
              </div>
            </div>
          </div>
          <RefreshButton />
        </div>
      );
    }
  }
}
