import React from 'react';
import TimeBlockConverter from './TimeBlockConverter';

export function DealProposalForm({ dealProposal, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Client Address</label>
        <input
          type="text"
          value={dealProposal.client}
          disabled
          className="w-full p-2 border rounded bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {dealProposal.piece_cid && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Piece CID</label>
          <input
            type="text"
            value={dealProposal.piece_cid}
            disabled
            className="w-full p-2 border rounded bg-gray-50 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Piece Size</label>
        <input
          type="number"
          value={dealProposal.piece_size}
          onChange={(e) => onChange({ ...dealProposal, piece_size: parseInt(e.target.value) })}
          className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
        <input
          type="text"
          value={dealProposal.label}
          onChange={(e) => onChange({ ...dealProposal, label: e.target.value })}
          className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <TimeBlockConverter dealProposal={dealProposal} onChange={onChange} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Storage Price Per Block</label>
        <input
          type="number"
          value={dealProposal.storage_price_per_block}
          onChange={(e) => onChange({ ...dealProposal, storage_price_per_block: parseInt(e.target.value) })}
          className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Provider Collateral</label>
        <input
          type="number"
          value={dealProposal.provider_collateral}
          onChange={(e) => onChange({ ...dealProposal, provider_collateral: parseInt(e.target.value) })}
          className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Client Collateral</label>
        <input
          type="number"
          value={dealProposal.client_collateral}
          onChange={(e) => onChange({ ...dealProposal, client_collateral: parseInt(e.target.value) })}
          className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  );
}