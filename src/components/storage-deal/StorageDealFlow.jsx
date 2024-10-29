// StorageDealFlow.jsx
import React, { useState, useEffect } from 'react';
import { Alert } from './Alert';
import { ProviderInfo } from './ProviderInfo';
import { StepIndicator, STEPS } from './Steps';
import { ConnectWallet } from './steps/ConnectWallet';
import { ConnectProvider } from './steps/ConnectProvider';
import { ProposeDeal } from './steps/ProposeDeal';
import { PublishDeal } from './steps/PublishDeal';
import { DEFAULT_DEAL_PROPOSAL } from '../../utils/constants';

export default function StorageDealFlow() {
  const [currentStep, setCurrentStep] = useState(1);
  const [providerUrl, setProviderUrl] = useState('http://127.0.0.1');
  const [providerInfo, setProviderInfo] = useState(null);
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
        const extensions = await web3Enable('Storage Deal Flow');

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
        showAlert('Successfully connected to Polkadot.js extension');
        setCurrentStep(2);
      } catch (err) {
        showAlert('Failed to connect to Polkadot.js extension: ' + err.message, true);
      }
    };

    initExtension();
  }, []);

  const showAlert = (message, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess(null);
    } else {
      setSuccess(message);
      setError(null);
    }
  };

  const getProviderInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${providerUrl}:8000/info`);
      const data = await response.json();
      setProviderInfo(data);
      showAlert('Successfully connected to provider');
      setCurrentStep(3);
    } catch (err) {
      showAlert('Failed to connect to provider: ' + err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const proposeDeal = async () => {
    try {
      setLoading(true);

      if (!dealProposal.piece_cid) {
        throw new Error('Please generate a test file first to get a piece CID');
      }

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

      // Upload file immediately after successful proposal
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadResponse = await fetch(`${providerUrl}:8001/upload/${result.Ok}`, {
        method: 'PUT',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(await uploadResponse.text());
      }

      await uploadResponse.text();
      showAlert('Deal proposed and file uploaded successfully');
      setCurrentStep(4);
    } catch (err) {
      showAlert('Failed to propose deal: ' + err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const publishDeal = async () => {
    try {
      setLoading(true);
      const { web3FromAddress } = await import('@polkadot/extension-dapp');

      const encodingResponse = await fetch(`${providerUrl}:8000/encode_proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealProposal),
      });

      if (!encodingResponse.ok) {
        throw new Error(await encodingResponse.text());
      }

      const { Ok: encodedProposal } = await encodingResponse.json();
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

      const publishResponse = await fetch(`${providerUrl}:8000/publish_deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signedDeal),
      });

      if (!publishResponse.ok) {
        throw new Error(await publishResponse.text());
      }

      const publishResult = await publishResponse.json();
      if (publishResult.Err) {
        throw new Error(publishResult.Err);
      }

      setIsPublished(true);
      showAlert(`Deal published successfully! Deal ID: ${publishResult.Ok}`);
    } catch (err) {
      showAlert('Failed to publish deal: ' + err.message, true);
    } finally {
      setLoading(false);
    }
  };

  const startNewDeal = () => {
    // Reset deal-specific state while keeping wallet and provider connections
    setDealProposal({
      ...DEFAULT_DEAL_PROPOSAL,
      client: selectedAccount.address // Maintain the connected wallet address
    });
    setDealCid(null);
    setSelectedFile(null);
    setIsPublished(false);
    setCurrentStep(3); // Go back to propose deal step
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Storage Deal Flow</h1>

      {error && <Alert variant="error" title="Error">{error}</Alert>}
      {success && <Alert variant="info" title="Success">{success}</Alert>}

      <div className="mb-8">
        <StepIndicator steps={STEPS} currentStep={currentStep} />
      </div>

      {/* Only show ProviderInfo when not in publishing state */}
      {providerInfo && currentStep > 2 && !loading && currentStep === 4 && !isPublished && (
        <ProviderInfo providerInfo={providerInfo} />
      )}

      <div className="space-y-4">
        {currentStep === 1 && <ConnectWallet />}

        {currentStep === 2 && (
          <ConnectProvider
            providerUrl={providerUrl}
            onProviderUrlChange={setProviderUrl}
            onConnect={getProviderInfo}
            loading={loading}
          />
        )}

        {currentStep === 3 && (
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
