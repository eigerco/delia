import React, { useState, useEffect } from 'react';
import { Alert } from './Alert';
import { ProviderInfo } from './ProviderInfo';
import { StepIndicator, STEPS } from './Steps';
import { ConnectWallet } from './steps/ConnectWallet';
import { ProviderSelector } from './steps/ProviderSelector';
import { ProposeDeal } from './steps/ProposeDeal';
import { PublishDeal } from './steps/PublishDeal';
import { DEFAULT_DEAL_PROPOSAL } from '../../utils/constants';

// Server endpoints by protocol
const JSON_RPC_PORT = 8000; // Running jsonrpsee RPC server
const HTTP_PORT = 8001;     // Running axum REST server

// Helper function for JSON-RPC calls
const makeRpcCall = async (url, method, params = []) => {
  // Check if method already has v0_ prefix to avoid double prefixing
  const prefixedMethod = method.startsWith('v0_') ? method : `v0_${method}`;
  
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: prefixedMethod,
    params
  };
  
  console.log('RPC Request:', {
    url: `http://${url}:${JSON_RPC_PORT}/rpc`,
    method: request.method,
    params: JSON.stringify(params, null, 2)
  });

  const response = await fetch(`http://${url}:${JSON_RPC_PORT}/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  const jsonResponse = await response.json();
  console.log('RPC Response:', jsonResponse);

  if (jsonResponse.error) {
    throw new Error(jsonResponse.error.message);
  }
  return jsonResponse.result;
};

export default function StorageDealFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [providerUrl, setProviderUrl] = useState('');
  const [providerInfo, setProviderInfo] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [dealCid, setDealCid] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [dealProposal, setDealProposal] = useState(DEFAULT_DEAL_PROPOSAL);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    const initExtension = async () => {
      try {
        const { web3Enable, web3Accounts } = await import('@polkadot/extension-dapp');
        const extensions = await web3Enable('Delia');

        if (extensions.length === 0) {
          throw new Error('No extension found');
        }

        const accounts = await web3Accounts();
        if (accounts.length === 0) {
          throw new Error('No accounts found. Please create an account in your Polkadot.js extension');
        }

        setAccounts(accounts);
        setSelectedAccount(accounts[0]);
        setDealProposal(prev => ({
          ...prev,
          client: accounts[0].address
        }));
        showAlert('Successfully connected to Polkadot.js extension', 'success');
        setCurrentStep(2);
      } catch (err) {
        showAlert(err.message, 'error');
      }
    };

    initExtension();
  }, []);

  const showAlert = (message, type = 'info') => {
    console.log(`Showing ${type} alert:`, message);
    if (type === 'error') {
      setError(message);
      setSuccess(null);
    } else if (type === 'success') {
      setSuccess(message);
      setError(null);
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    }
  };

  const dismissError = () => {
    setError(null);
  };

  const getProviderInfo = async (provider) => {
    try {
      setLoading(true);
      console.log('Fetching provider info via RPC');
      
      const info = await makeRpcCall(provider.info.url, 'info');
      setProviderInfo(info);
      showAlert('Successfully connected to provider', 'success');
      setCurrentStep(3);
    } catch (err) {
      setSelectedProvider(null);
      setProviderUrl('');
      showAlert(`Failed to connect to provider: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProviderSelect = async (provider) => {
    console.log('Provider selected:', provider);
    setSelectedProvider(provider);
    setProviderUrl(provider.info.url);
    await getProviderInfo(provider);
  };

  const proposeDeal = async () => {
    try {
      setLoading(true);
  
      // Calculate piece CID using HTTP server
      const formData = new FormData();
      formData.append('file', selectedFile);
  
      console.log('Calculating piece CID via HTTP endpoint');
      const pieceResponse = await fetch(`http://${providerUrl}:${HTTP_PORT}/calculate_piece_cid`, {
        method: 'PUT',
        body: formData,
      });
  
      if (!pieceResponse.ok) {
        throw new Error(await pieceResponse.text());
      }
  
      const pieceCid = await pieceResponse.text();
      
      // Update deal proposal with the calculated piece CID
      const updatedDealProposal = {
        ...dealProposal,
        piece_cid: pieceCid,
      };
  
      // Propose deal using JSON-RPC
      console.log('Proposing deal via RPC');
      const dealCid = await makeRpcCall(providerUrl, 'propose_deal', [updatedDealProposal]);
      setDealCid(dealCid);
      
      console.log('Uploading file via HTTP endpoint');
      const uploadResponse = await fetch(`http://${providerUrl}:${HTTP_PORT}/upload/${dealCid}`, {
          method: 'PUT',
          body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(await uploadResponse.text());
      }
  
      await uploadResponse.text();
      showAlert('Deal proposed and file uploaded successfully', 'success');
      setCurrentStep(4);
    } catch (err) {
      showAlert(err.message || 'An unknown error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  const publishDeal = async () => {
    try {
      setLoading(true);
      const { web3FromAddress } = await import('@polkadot/extension-dapp');
  
      console.log('Encoding proposal via HTTP endpoint');
      const encodingResponse = await fetch(`http://${providerUrl}:${HTTP_PORT}/encode_proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealProposal),
      });
  
      if (!encodingResponse.ok) {
        throw new Error(await encodingResponse.text());
      }
  
      const result = await encodingResponse.json();
      const encodedProposal = result.Ok;
      const injector = await web3FromAddress(selectedAccount.address);
      const signRaw = injector?.signer?.signRaw;
  
      if (!signRaw) {
        throw new Error('Signing is not supported by the extension');
      }
  
      const { signature } = await signRaw({
        address: selectedAccount.address,
        data: encodedProposal,
        type: 'bytes',
        withWrapper: false
      });
  
      const signedDeal = {
        deal_proposal: dealProposal,
        client_signature: {
          Sr25519: signature
        }
      };
  
      console.log('Publishing deal with payload:', JSON.stringify(signedDeal, null, 2));
      const dealId = await makeRpcCall(providerUrl, 'publish_deal', [signedDeal]);
      console.log('Received deal ID:', dealId);
  
      setIsPublished(true);
      showAlert(`Deal published successfully! Deal ID: ${dealId}`, 'success');
    } catch (err) {
      showAlert(err.message, 'error');
      setCurrentStep(3);
    } finally {
      setLoading(false);
    }
  };

  const startNewDeal = () => {
    setDealProposal({
      ...DEFAULT_DEAL_PROPOSAL,
      client: selectedAccount.address
    });
    setDealCid(null);
    setSelectedFile(null);
    setIsPublished(false);
    setCurrentStep(3);
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Delia</h1>

      {currentStep === 4 && error && (
        <Alert variant="error" title="Error" onDismiss={dismissError}>{error}</Alert>
      )}

      <div className="mb-8">
        <StepIndicator steps={STEPS} currentStep={currentStep} />
      </div>

      {error && currentStep !== 4 && (
        <Alert variant="error" title="Error" onDismiss={dismissError}>{error}</Alert>
      )}

      {success && (
        <Alert variant="success" title="Success">{success}</Alert>
      )}

      {selectedProvider && providerInfo && currentStep > 2 && !loading && (
        <ProviderInfo providerInfo={providerInfo} />
      )}

      <div className="space-y-4">
        {currentStep === 1 && <ConnectWallet onConnect={setAccounts} />}

        {currentStep === 2 && (
          <ProviderSelector
            onSelect={handleProviderSelect}
            loading={loading}
            selectedProvider={selectedProvider}
          />
        )}

        {currentStep === 3 && providerInfo && (
          <ProposeDeal
            dealProposal={dealProposal}
            onDealProposalChange={setDealProposal}
            onPropose={proposeDeal}
            loading={loading}
            dealCid={dealCid}
            providerUrl={providerUrl}
            showAlert={showAlert}
            setLoading={setLoading}
            setSelectedFile={setSelectedFile}
          />
        )}

        {currentStep === 4 && (
          <PublishDeal
            onPublish={publishDeal}
            loading={loading}
            isPublished={isPublished}
            onNewDeal={startNewDeal}
          />
        )}
      </div>
    </div>
  );
}