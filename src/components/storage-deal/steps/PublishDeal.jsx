import React from 'react';
import { Loader2, Send } from 'lucide-react';

export function PublishDeal({ onPublish, loading, isPublished, onNewDeal }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="animate-spin mx-auto mb-4 text-blue-500" size={32} />
        <p className="text-gray-600 mb-2">Publishing deal on-chain...</p>
        <p className="text-sm text-gray-500">This process may take 2-3 minutes</p>
      </div>
    );
  }

  if (isPublished) {
    return (
      <div className="text-center py-8">
        <div className="mb-6 p-4 bg-green-50 text-green-800 rounded-lg">
          <p className="font-medium">Deal Published Successfully!</p>
          <p className="text-sm mt-1">Your storage deal has been published on-chain.</p>
        </div>
        <button
          onClick={onNewDeal}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Create Another Deal
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Publish Deal</h2>
      <button
        onClick={onPublish}
        className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        <Send className="mr-2" />
        Publish Deal
      </button>
    </div>
  );
}
