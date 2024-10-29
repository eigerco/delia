import React from 'react';
import { Loader2, Send } from 'lucide-react';

export function ConnectProvider({ providerUrl, onProviderUrlChange, onConnect, loading }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Connect to Provider</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Provider URL</label>
        <input
          type="text"
          value={providerUrl}
          onChange={(e) => onProviderUrlChange(e.target.value)}
          className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter provider URL..."
        />
      </div>
      <button
        onClick={onConnect}
        disabled={loading}
        className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
        Connect to Provider
      </button>
    </div>
  );
}
