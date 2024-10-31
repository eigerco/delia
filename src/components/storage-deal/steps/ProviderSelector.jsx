import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Server, CheckCircle2, AlertCircle } from 'lucide-react';
import { xxhashAsHex } from '@polkadot/util-crypto';

function hexToUint8Array(hexString) {
  return new Uint8Array(
    hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
  );
}

function createStorageKey() {
  const modulePrefix = xxhashAsHex('StorageProvider', 128).slice(2);
  const storagePrefix = xxhashAsHex('StorageProviders', 128).slice(2);
  return `0x${modulePrefix}${storagePrefix}`;
}
function decodeProviderState(hexData, key) {
  const data = hexData.slice(2);

  const totalLength = parseInt(data.slice(0, 2), 16);

  const peerIdLength = parseInt(data.slice(2, 4), 16);
  const peerIdHex = data.slice(4, 4 + (peerIdLength * 2));

  let peerId = new TextDecoder().decode(
    hexToUint8Array(peerIdHex)
  );

  if (peerId.startsWith('27.0.0.1')) {
    peerId = '127.0.0.1';
  }

  peerId = peerId.split('\0')[0].trim();

  const accountId = key.slice(key.length - 64);

  console.log('Decoded provider IP:', peerId);

  return {
    info: {
      url: peerId,
      window_post_proof_type: 'StackedDRGWindow2KiBV1P1',
      sector_size: 2048,
      window_post_partition_sectors: 2
    },
    address: `0x${accountId}`
  };
}
export function ProviderSelector({ onSelect, loading, selectedProvider }) {
  const [providers, setProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const pendingRequestsRef = useRef(new Map());

  useEffect(() => {
    let mounted = true;

    const connectWebSocket = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      wsRef.current = new WebSocket('ws://127.0.0.1:42069');

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        if (mounted) {
          setLoadingProviders(true);
          const request = {
            jsonrpc: '2.0',
            id: 1,
            method: 'state_getKeys',
            params: [createStorageKey()]
          };
          wsRef.current.send(JSON.stringify(request));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          console.log('Chain response:', response);

          if (response.error) {
            console.error('Chain error:', response.error);
            if (mounted) {
              setError(`Chain error: ${response.error.message}`);
              setLoadingProviders(false);
            }
            return;
          }

          if (!response.result) {
            console.error('No result in response');
            return;
          }

          if (response.id === 1) {
            if (response.result.length === 0) {
              if (mounted) {
                setLoadingProviders(false);
              }
              return;
            }

            if (mounted) {
              setProviders([]);
              pendingRequestsRef.current.clear();
            }

            response.result.forEach((key, index) => {
              const requestId = index + 2;
              pendingRequestsRef.current.set(requestId, key);

              const request = {
                jsonrpc: '2.0',
                id: requestId,
                method: 'state_getStorage',
                params: [key]
              };
              wsRef.current.send(JSON.stringify(request));
            });
          } else {
            const key = pendingRequestsRef.current.get(response.id);
            if (!key) {
              console.error('No key found for response:', response.id);
              return;
            }

            try {
              const provider = decodeProviderState(response.result, key);
              if (mounted) {
                setProviders(prev => [...prev, provider]);
              }
            } catch (err) {
              console.error('Failed to decode provider data:', err);
            }

            pendingRequestsRef.current.delete(response.id);
          }
        } catch (err) {
          console.error('Chain data parse error:', err);
          if (mounted) {
            setError('Failed to parse provider data');
          }
        }

        if (mounted && pendingRequestsRef.current.size === 0) {
          setLoadingProviders(false);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (mounted) {
          setError('Failed to connect to chain');
          setLoadingProviders(false);
        }
      };
    };

    connectWebSocket();

    return () => {
      mounted = false;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  if (loadingProviders) {
    return (
      <div className="text-center py-8">
        <Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-500 mb-4" />
        <p className="text-gray-600">Loading storage providers...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Select Storage Provider</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4">
        {providers.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <Server className="mx-auto h-12 w-12 text-gray-400 mb-2" />
            <p className="text-gray-500">No storage providers found</p>
            <p className="text-sm mt-2 text-gray-400">
              Run a storage provider node and register it on chain
            </p>
            <p className="text-xs mt-1 text-gray-400 font-mono">
              endpoint: ws://127.0.0.1:42069
            </p>
          </div>
        ) : (
          providers.map((provider, idx) => (
            <button
              key={`${provider.address}-${idx}`}
              onClick={() => onSelect(provider)}
              disabled={loading}
              className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${selectedProvider?.address === provider.address
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
                }`}
            >
              <div className="flex items-center gap-3">
                <Server className="text-gray-500" />
                <div className="text-left">
                  <div className="font-medium truncate max-w-md">
                    {provider.address}
                  </div>
                  <div className="text-sm text-gray-500">
                    Sector Size: {provider.info.sector_size} bytes
                  </div>
                </div>
              </div>
              {selectedProvider?.address === provider.address && (
                <CheckCircle2 className="text-blue-500" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}