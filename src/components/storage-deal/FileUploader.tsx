import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, FileText } from 'lucide-react';

export function FileUploader({ onFileSelect, loading, selectedFile }) {
    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            onFileSelect(acceptedFiles[0]);
        }
    }, [onFileSelect]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        disabled: loading // Prevent new uploads while processing
    });

    return (
        <div
            {...getRootProps()}
            className={`flex flex-col items-center p-6 border-2 border-dashed rounded-lg transition-colors ${isDragActive ? 'border-blue-400 bg-blue-50' :
                selectedFile ? 'border-green-500 bg-green-50' :
                    'border-gray-300'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'}`}
        >
            <input {...getInputProps()} disabled={loading} />

            {loading ? (
                <>
                    <Loader2 className="w-12 h-12 text-gray-400 mb-2 animate-spin" />
                    <p className="text-sm text-gray-600">Processing file...</p>
                </>
            ) : selectedFile ? (
                <>
                    <FileText className="w-12 h-12 text-green-500 mb-2" />
                    <p className="text-sm font-medium text-green-600">File processed successfully!</p>
                    <p className="text-sm text-green-600 font-mono mt-1">{selectedFile.name}</p>
                    <p className="text-xs text-green-600 mt-2">Drop another file to replace</p>
                </>
            ) : (
                <>
                    <Upload className="w-12 h-12 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600">
                        {isDragActive
                            ? 'Drop the file here...'
                            : 'Drag and drop a file here, or click to select'}
                    </p>
                </>
            )}
        </div>
    );
}
