import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export function ConnectWallet({ onConnect }) {
  const [retryCount, setRetryCount] = useState(0);
  const [status, setStatus] = useState('connecting');

  const connectWallet = async () => {
    try {
      const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
      const extensions = await web3Enable('Storage Deal Flow');

      if (extensions.length === 0) {
        throw new Error('No extension found');
      }

      const accounts = await web3Accounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found. Please create an account in your Polkadot.js extension');
      }

      onConnect(accounts);
      setStatus('connected');
    } catch (err) {
      setStatus('failed');
      if (retryCount < MAX_RETRIES) {
        setStatus('retrying');
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          connectWallet();
        }, RETRY_DELAY);
      }
    }
  };

  useEffect(() => {
    connectWallet();
  }, []);

  const getStatusMessage = () => {
    switch (status) {
      case 'connecting':
        return 'Connecting to Polkadot.js extension...';
      case 'retrying':
        return `Connection failed. Retrying (${retryCount}/${MAX_RETRIES})...`;
      case 'failed':
        return 'Failed to connect. Please check your extension and reload the page.';
      default:
        return 'Connected!';
    }
  };

  return (
    <div className="text-center py-8">
      {status === 'failed' ? (
        <div>
          <RefreshCw className="mx-auto mb-4" size={32} />
          <p className="text-red-600">{getStatusMessage()}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reload Page
          </button>
        </div>
      ) : (
        <>
          <Loader2 className="animate-spin mx-auto mb-4" size={32} />
          <p>{getStatusMessage()}</p>
        </>
      )}
    </div>
  );
}
