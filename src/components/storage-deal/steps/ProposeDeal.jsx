import React, { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { DealProposalForm } from '../DealProposalForm';
import { FileUploader } from '../FileUploader';

export function ProposeDeal({
  dealProposal,
  onDealProposalChange,
  onPropose,
  loading,
  dealCid,
  providerUrl,
  showAlert,
  setLoading,
  setSelectedFile
}) {
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleFileUpload = async (file) => {
    try {
      setLoading(true);
      setUploadedFile(file);

      // Calculate the piece CID
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${providerUrl}:8001/calculate_piece_cid`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const pieceCid = await response.text();

      // Update the deal proposal with the new CID
      onDealProposalChange({
        ...dealProposal,
        piece_cid: pieceCid
      });

      // Store the file for later upload
      setSelectedFile(file);

      showAlert(`File processed successfully!`);
    } catch (err) {
      setUploadedFile(null);
      showAlert('Failed to process file: ' + err.message, true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Propose Deal</h2>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border">
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">File Upload</h3>
            <FileUploader
              onFileSelect={handleFileUpload}
              loading={loading}
              selectedFile={uploadedFile}
            />
          </div>

          {dealProposal.piece_cid && (
            <>
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Deal Configuration</h3>
                <DealProposalForm dealProposal={dealProposal} onChange={onDealProposalChange} />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onPropose}
                  disabled={loading}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin mr-2" />
                      Proposing Deal...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2" />
                      Propose Deal
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {dealCid && (
          <div className="p-4 bg-gray-100 rounded-lg">
            <span className="font-medium">Deal CID:</span>
            <span className="font-mono text-sm ml-2">{dealCid}</span>
          </div>
        )}
      </div>
    </div>
  );
}
