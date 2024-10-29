import React from 'react';

export function ProviderInfo({ providerInfo }) {
  if (!providerInfo) return null;

  return (
    <div className="mb-6 bg-white border rounded-lg shadow">
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Provider Information</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-500">Address</span>
              <span className="text-sm font-mono break-all">{providerInfo.address}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-500">Start Time</span>
              <span className="text-sm">{new Date(providerInfo.start_time).toLocaleString()}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-500">Seal Proof</span>
              <span className="text-sm">{providerInfo.seal_proof}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-500">PoSt Proof</span>
              <span className="text-sm">{providerInfo.post_proof}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
