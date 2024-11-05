import React, { useState, useEffect } from 'react';
import { Alert } from './Alert';
import { ProviderInfo } from './ProviderInfo';
import { StepIndicator, STEPS } from './Steps';
import { ConnectWallet } from './steps/ConnectWallet';
import { ProviderSelector } from './steps/ProviderSelector';
import { ProposeDeal } from './steps/ProposeDeal';
import { PublishDeal } from './steps/PublishDeal';
import { DEFAULT_DEAL_PROPOSAL } from '../../utils/constants';

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
      const infoUrl = `http://${provider.info.url}:8001/info`;  // Changed from 8000 to 8001
      console.log('Fetching provider info from:', infoUrl);

      const response = await fetch(infoUrl);

      if (!response.ok) {
        throw new Error(`Provider returned status: ${response.status}`);
      }

      const data = await response.json();
      setProviderInfo(data);
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

        // First, calculate the piece CID
        const formData = new FormData();
        formData.append('file', selectedFile);

        const pieceResponse = await fetch(`http://${providerUrl}:8001/calculate_piece_cid`, {
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

        // Now propose the deal
        console.log('Proposing deal to:', `http://${providerUrl}:8001/propose_deal`);
        const response = await fetch(`http://${providerUrl}:8001/propose_deal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedDealProposal),
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const dealCid = await response.text();
        setDealCid(dealCid);

        // Now upload the actual file
        console.log('Uploading file to:', `http://${providerUrl}:8001/upload/${dealCid}`);
        const uploadResponse = await fetch(`http://${providerUrl}:8001/upload/${dealCid}`, {
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

    console.log('Encoding proposal at:', `http://${providerUrl}:8001/encode_proposal`);
    const encodingResponse = await fetch(`http://${providerUrl}:8001/encode_proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dealProposal),
    });

    if (!encodingResponse.ok) {
      throw new Error(await encodingResponse.text());
    }

    const result = await encodingResponse.json();
    // Get the actual hex string from the Ok result
    const encodedProposal = result.Ok;  // Now it's just the "0x..." string
    const injector = await web3FromAddress(selectedAccount.address);
    const signRaw = injector?.signer?.signRaw;

    if (!signRaw) {
      throw new Error('Signing is not supported by the extension');
    }

    const { signature } = await signRaw({
      address: selectedAccount.address,
      data: encodedProposal,  // Now this is just the hex string
      type: 'bytes',
      withWrapper: false
    });

    const signedDeal = {
      deal_proposal: dealProposal,
      client_signature: {
        Sr25519: signature
      }
    };

    console.log('Publishing deal to:', `http://${providerUrl}:8001/publish_deal`);  // Note: changed to 8001
    const publishResponse = await fetch(`http://${providerUrl}:8001/publish_deal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedDeal),
    });

    if (!publishResponse.ok) {
      throw new Error(await publishResponse.text());
    }

    const publishResult = await publishResponse.json();
    setIsPublished(true);
    showAlert(`Deal published successfully! Deal ID: ${publishResult}`, 'success');
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