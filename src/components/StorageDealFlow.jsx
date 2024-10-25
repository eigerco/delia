import React, { useState, useRef, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Upload, Send, Loader2 } from 'lucide-react';

// Constants for demo addresses
const DEMO_CLIENT_ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";
const DEMO_PROVIDER_ADDRESS = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";

// Default deal proposal values
const DEFAULT_DEAL_PROPOSAL = {
  piece_cid: "baga6ea4seaqjqwo3ck54anw2xch5pqbgblsefsisbfscldgcytt2pldanx4osay",
  piece_size: 2048,
  verified_deal: false,
  client: DEMO_CLIENT_ADDRESS,
  provider: DEMO_PROVIDER_ADDRESS,
  label: "New Test Deal",
  start_block: 4900,
  end_block: 5300,
  storage_price_per_block: 500000000,
  provider_collateral: 12500000000,
  client_collateral: 0,
  state: "Published"
};

const hexToBytes = (hex) => {
  const bytes = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return bytes;
};

// SCALE encoding helpers
const encodeCompact = (number) => {
  if (number < 64) {
    return [number << 2];
  } else if (number < 2 ** 14) {
    return [(number << 2) | 0b01, number >> 6];
  } else if (number < 2 ** 30) {
    return [
      (number << 2) | 0b10,
      (number >> 6) & 0xFF,
      (number >> 14) & 0xFF,
      (number >> 22) & 0xFF
    ];
  } else {
    const bytes = [];
    let n = number;
    while (n > 0) {
      bytes.push(n & 0xFF);
      n = n >> 8;
    }
    bytes[0] = (bytes[0] << 2) | 0b11;
    return bytes;
  }
};

const encodeString = (str) => {
  const bytes = new TextEncoder().encode(str);
  return [...encodeCompact(bytes.length), ...bytes];
};

const encodeU64 = (number) => {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(number), true);
  return Array.from(new Uint8Array(buffer));
};

const encodeU32 = (number) => {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, number, true)
  return Array.from(new Uint8Array(buffer));
};

const encodeDealProposal = (proposal) => {
  // This function mimics the SCALE encoding that Rust is doing
  const pieces = [
    // Piece CID (hardcoded for now as it needs special encoding)
    hexToBytes("9220209859db12bbc036dab88fd7c0260ae442c9120964258cc2c4e7a7ac606df8e903"),
    // piece_size (encoded as compact)
    encodeCompact(proposal.piece_size),
    // client address (hardcoded for demo)
    hexToBytes("d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d"),
    // provider address (hardcoded for demo)
    hexToBytes("90b5ab205c6974c9ea841be688864633dc9ca8a357843eeacf2314649965fe223"),
    // label
    encodeString(proposal.label),
    // start_block
    encodeU32(proposal.start_block),
    // end_block
    encodeU32(proposal.end_block),
    // storage_price_per_block
    encodeU64(proposal.storage_price_per_block),
    // provider_collateral
    encodeU64(proposal.provider_collateral),
    // state
    [0], // 0 = Published
  ];

  return pieces.flat();
};

function Alert({ variant = "info", title, children }) {
  const styles = {
    info: "bg-blue-100 text-blue-800",
    error: "bg-red-100 text-red-800",
  };

  return (
    <div className={`${styles[variant]} p-4 rounded-lg mb-4`}>
      <div className="flex items-center gap-2">
        {variant === "error" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
        <div className="font-bold">{title}</div>
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function DealProposalForm({ dealProposal, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-4 mb-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Piece CID</label>
        <input
          type="text"
          value={dealProposal.piece_cid}
          onChange={(e) => onChange({ ...dealProposal, piece_cid: e.target.value })}
          className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
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
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Block</label>
          <input
            type="number"
            value={dealProposal.start_block}
            onChange={(e) => onChange({ ...dealProposal, start_block: parseInt(e.target.value) })}
            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Block</label>
          <input
            type="number"
            value={dealProposal.end_block}
            onChange={(e) => onChange({ ...dealProposal, end_block: parseInt(e.target.value) })}
            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
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

const steps = [
  { id: 1, name: 'Connect to Provider' },
  { id: 2, name: 'Propose Deal' },
  { id: 3, name: 'Upload File' },
  { id: 4, name: 'Publish Deal' }
];

export default function StorageDealFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [providerUrl, setProviderUrl] = useState('http://127.0.0.1');
  const [providerInfo, setProviderInfo] = useState(null);
  const [dealCid, setDealCid] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dealProposal, setDealProposal] = useState(DEFAULT_DEAL_PROPOSAL);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const showAlert = (message, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess(null);
    } else {
      setSuccess(message);
      setError(null);
    }
  };

  const createTestFile = useCallback(() => {
    const testData = new Array(1024).fill('test data ').join('').slice(0, 1024);
    const blob = new Blob([testData], { type: 'text/plain' });
    const file = new File([blob], 'test-file-1024.txt', { type: 'text/plain' });
    setSelectedFile(file);
    showAlert('Created test file: test-file-1024.txt');
  }, []);

  const getProviderInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${providerUrl}:8000/info`);
      const data = await response.json();
      setProviderInfo(data);
      showAlert('Successfully connected to provider');
      setCurrentStep(2);
    } catch (err) {
      showAlert('Failed to connect to provider: ' + err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const proposeDeal = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${providerUrl}:8000/propose_deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealProposal),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      if (result.Err) {
        throw new Error(result.Err);
      }

      setDealCid(result.Ok);
      showAlert('Deal proposed successfully');
      setCurrentStep(3);
    } catch (err) {
      showAlert('Failed to propose deal: ' + err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile || !dealCid) {
      showAlert('Please select a file and ensure deal is proposed', true);
      return;
    }

    try {
      setLoading(true);

      // Create form data
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${providerUrl}:8001/upload/${dealCid}`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.text();
      showAlert('File uploaded successfully');
      setCurrentStep(4);
    } catch (err) {
      showAlert('Failed to upload file: ' + err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const publishDeal = async () => {
    try {
      setLoading(true);

      // Generate encoded proposal
      const encodedProposal = encodeDealProposal(dealProposal);
      console.log('Encoded proposal:', Array.from(encodedProposal).map(b => b.toString(16).padStart(2, '0')).join(''));

      // Get signature from server
      const signResponse = await fetch(`${providerUrl}:8000/sign_deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealProposal),
      });

      if (!signResponse.ok) {
        throw new Error('Failed to sign deal');
      }

      const signResult = await signResponse.json();
      if (signResult.Err) {
        throw new Error(signResult.Err);
      }

      // Create the full signed proposal
      const signedDeal = {
        deal_proposal: dealProposal,
        client_signature: {
          Sr25519: `0x${signResult.Ok}`
        }
      };

      console.log('Sending publish payload:', JSON.stringify(signedDeal, null, 2));

      // Then publish with the signature
      const publishResponse = await fetch(`${providerUrl}:8000/publish_deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedDeal),
      });

      if (!publishResponse.ok) {
        const errorText = await publishResponse.text();
        console.error('Publish error response:', errorText);
        throw new Error(errorText);
      }

      const publishResult = await publishResponse.json();
      console.log('Publish response:', publishResult);

      if (publishResult.Err) {
        throw new Error(publishResult.Err);
      }

      showAlert(`Deal published successfully! Deal ID: ${publishResult.Ok}`);

      setCurrentStep(4);
    } catch (err) {
      showAlert('Failed to publish deal: ' + err.message, true);
      console.error('Publish error details:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderProviderInfo = () => {
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
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Storage Deal Flow</h1>

      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="info" title="Success">
          {success}
        </Alert>
      )}

      <div className="mb-8">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`flex items-center ${step.id === currentStep
                ? 'text-blue-600'
                : step.id < currentStep
                  ? 'text-green-600'
                  : 'text-gray-400'
                }`}
            >
              <div
                className={`flex items-center justify-center w-8 h-8 border-2 rounded-full ${step.id === currentStep
                  ? 'border-blue-600'
                  : step.id < currentStep
                    ? 'border-green-600'
                    : 'border-gray-400'
                  }`}
              >
                {step.id < currentStep ? (
                  <CheckCircle2 size={16} />
                ) : (
                  step.id
                )}
              </div>
              <span className="ml-2 text-sm">{step.name}</span>
            </div>
          ))}
        </div>
      </div>

      {providerInfo && currentStep > 1 && renderProviderInfo()}

      <div className="space-y-4">
        {currentStep === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Connect to Provider</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider URL</label>
              <input
                type="text"
                value={providerUrl}
                onChange={(e) => setProviderUrl(e.target.value)}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter provider URL..."
              />
            </div>
            <button
              onClick={getProviderInfo}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
              Connect to Provider
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Propose Deal</h2>
            <DealProposalForm dealProposal={dealProposal} onChange={setDealProposal} />
            <button
              onClick={proposeDeal}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
              Propose Deal
            </button>
            {dealCid && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                Deal CID: {dealCid}
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Upload File</h2>
            <div className="mb-4">
              <div className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                <Upload className="w-12 h-12 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  {selectedFile ? selectedFile.name : 'Generate a test file to upload'}
                </p>
                <button
                  onClick={createTestFile}
                  className="px-4 py-2 text-sm text-green-600 border border-green-600 rounded hover:bg-green-50"
                >
                  Generate Test File
                </button>
              </div>
            </div>
            <button
              onClick={uploadFile}
              disabled={loading || !selectedFile}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2" />}
              Upload File
            </button>
          </div>
        )}

        {currentStep === 4 && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Publish Deal</h2>
            <button
              onClick={publishDeal}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Send className="mr-2" />}
              Publish Deal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
