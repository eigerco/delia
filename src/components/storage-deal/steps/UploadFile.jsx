import React from 'react';
import { Upload, Loader2 } from 'lucide-react';

export function UploadFile({ selectedFile, onUpload, loading }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Upload File</h2>
      <div className="mb-4">
        <div className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
          <Upload className="w-12 h-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-2">
            {selectedFile ? selectedFile.name : 'No file selected'}
          </p>
        </div>
      </div>
      <button
        onClick={onUpload}
        disabled={loading || !selectedFile}
        className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {loading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2" />}
        Upload File
      </button>
    </div>
  );
}
