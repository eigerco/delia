import { isWeb3Injected, web3Accounts, web3Enable } from "@polkadot/extension-dapp";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "./buttons/Button";

enum WalletError {
  NoExtension = "no_extension",
  NoAccounts = "no_accounts",
}

export function ConnectWallet({
  onConnect,
}: {
  onConnect: (accounts: InjectedAccountWithMeta[]) => void;
}) {
  const [connecting, setConnecting] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<InjectedAccountWithMeta[] | null>(
    null,
  );
  const [error, setError] = useState<WalletError | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);

    if (!isWeb3Injected) {
      setError(WalletError.NoExtension);
      setConnecting(false);
      return;
    }

    const extensions = await web3Enable("Delia");
    if (extensions.length === 0) {
      setConnecting(false);
      return;
    }

    const accounts = await web3Accounts();
    if (accounts.length === 0) {
      setError(WalletError.NoAccounts);
      setConnecting(false);
      return;
    }

    setConnectedAccounts(accounts);
    onConnect(accounts);
    setConnecting(false);
  }, [onConnect]);

  useEffect(() => {
    if (isWeb3Injected && !connectedAccounts) {
      // Let React render before blocking popup call
      const timeout = setTimeout(() => connect(), 0);
      return () => clearTimeout(timeout);
    }
  }, [connectedAccounts, connect]);

  if (connecting) {
    return (
      <div className="py-6 text-center">
        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
        <p className="text-sm text-gray-600">Connecting to wallet...</p>
      </div>
    );
  }

  if (connectedAccounts) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-gray-600">Connected</p>
      </div>
    );
  }

  return (
    <div className="py-6 text-center">
      <Button
        onClick={connect}
        className="mx-auto px-5 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-md hover:shadow-lg transition duration-200 ease-in-out"
      >
        <div className="flex items-center gap-2">
          <img src="static/polkadotjs.png" alt="Polkadot" className="w-5 h-5" />
          <span>Connect Wallet</span>
        </div>
      </Button>

      {error === WalletError.NoExtension && (
        <p className="mt-2 text-sm text-red-500">
          Polkadot.js extension not found.{" "}
          <a
            href="https://polkadot.js.org/extension/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-600"
          >
            Install it here
          </a>
        </p>
      )}

      {error === WalletError.NoAccounts && (
        <p className="mt-2 text-sm text-red-500">
          No accounts found.{" "}
          <span className="block">
            Please open the <strong>Polkadot.js extension</strong>, go to{" "}
            <em>“Manage Website Access”</em>, and ensure accounts are authorized for this site.
          </span>
        </p>
      )}
    </div>
  );
}
