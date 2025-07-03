import { isWeb3Injected, web3Accounts, web3Enable } from "@polkadot/extension-dapp";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "./buttons/Button";

enum ConnectState {
  Idle = 0,
  Polling = 1,
  Connecting = 2,
  Connected = 3,
}

enum WalletError {
  NoExtension = "no_extension",
  NoAccounts = "no_accounts",
}

const MAX_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 100;

export function ConnectWallet({
  onConnect,
}: {
  onConnect: (accounts: InjectedAccountWithMeta[]) => void;
}) {
  const [state, setState] = useState(ConnectState.Idle);
  const [connectedAccounts, setConnectedAccounts] = useState<InjectedAccountWithMeta[] | null>(
    null,
  );
  const [error, setError] = useState<WalletError | null>(null);

  const connect = useCallback(async () => {
    setState(ConnectState.Connecting);
    setError(null);

    try {
      if (!isWeb3Injected) {
        setError(WalletError.NoExtension);
        return;
      }

      const extensions = await web3Enable("Delia");
      if (extensions.length === 0) {
        return;
      }

      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        setError(WalletError.NoAccounts);
        return;
      }

      setConnectedAccounts(accounts);
      onConnect(accounts);
      setState(ConnectState.Connected);
    } finally {
      if (state !== ConnectState.Connected) {
        setState(ConnectState.Idle);
      }
    }
  }, [onConnect, state]);

  useEffect(() => {
    if (connectedAccounts || error) return;

    setState(ConnectState.Polling);

    let attempts = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    intervalId = setInterval(() => {
      const injected = (window as Window & { injectedWeb3?: Record<string, unknown> }).injectedWeb3;

      if (injected && Object.keys(injected).length > 0) {
        if (intervalId) clearInterval(intervalId);
        connect();
        return;
      }

      attempts += 1;
      if (attempts >= MAX_ATTEMPTS) {
        if (intervalId) clearInterval(intervalId);
        setState(ConnectState.Idle);
        console.warn("ConnectWallet: Timeout waiting for injectedWeb3");
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [connectedAccounts, connect, error]);

  const renderError = () => {
    if (error === WalletError.NoExtension) {
      return (
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
      );
    }

    if (error === WalletError.NoAccounts) {
      return (
        <p className="mt-2 text-sm text-red-500">
          No accounts found.{" "}
          <span className="block">
            Please open the <strong>Polkadot.js extension</strong>, go to{" "}
            <em>“Manage Website Access”</em>, and ensure accounts are authorized for this site.
          </span>
        </p>
      );
    }

    return null;
  };

  if (state === ConnectState.Polling || state === ConnectState.Connecting) {
    return (
      <div className="py-6 text-center">
        <Loader2 className="animate-spin mx-auto mb-2" size={24} />
        <p className="text-sm text-gray-600">Connecting to wallet...</p>
      </div>
    );
  }

  if (state === ConnectState.Connected && connectedAccounts) {
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

      {renderError()}
    </div>
  );
}
