import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useCallback, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useOutletContext } from "react-router";
import { useCtx } from "../GlobalCtx";
import { DealProposalForm } from "../components/DealProposalForm";
import { ProviderSelector } from "../components/ProviderSelector";
import { DEFAULT_LOCAL_RPC_ADDRESS, DEFAULT_LOCAL_STORAGE_ADDRESS } from "../lib/consts";
import {
  DEFAULT_INPUT,
  type InputFields,
  type ValidatedFields,
  createSignedRpc,
  toRpc,
  validateInput,
} from "../lib/dealProposal";
import { uploadFile } from "../lib/fileUpload";
import { callProposeDeal, callPublishDeal } from "../lib/jsonRpc";
import { queryPeerId } from "../lib/requestResponse";
import type { StorageProviderInfo } from "../lib/storageProvider";

type OutletContextType = {
  accounts: InjectedAccountWithMeta[];
  selectedAccount: InjectedAccountWithMeta | null;
  setSelectedAccount: (account: InjectedAccountWithMeta) => void;
};

export function DealPreparation() {
  const { accounts, selectedAccount, setSelectedAccount } = useOutletContext<OutletContextType>();

  const [dealProposal, setDealProposal] = useState<InputFields>({
    ...DEFAULT_INPUT,
    client: selectedAccount?.address || null,
  });

  const [dealFile, setDealFile] = useState<File | null>(null);
  const [providers, setProviders] = useState(new Map<string, StorageProviderInfo>());
  const [selectedProviders, selectProviders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const updateProviderSelection = useCallback((newProvider: string) => {
    selectProviders((oldState) => {
      const newSet = new Set(oldState);
      if (newSet.has(newProvider)) {
        newSet.delete(newProvider);
      } else {
        newSet.add(newProvider);
      }
      return newSet;
    });
  }, []);

  const ctx = useCtx();

  const performDeal = async (p: string, validDealProposal: ValidatedFields) => {
    if (!dealFile) {
      // NOTE: This should never happen unless the "Continue" button is wrong
      toast.error("No file was selected");
      return;
    }

    // We can make a function out of this and use Promise.all for more efficiency
    const provider = providers.get(p);
    if (!provider) {
      // NOTE: this shouldn't really happen unless state management is wrong
      throw new Error("Selected provider does not exist");
    }

    const providerPeerId = provider.peerId;
    const peerIdMultiaddress = await queryPeerId(providerPeerId);
    if (!peerIdMultiaddress) {
      toast.error(`Failed to find multiaddress for PeerId: ${providerPeerId}`);
      return;
    }

    const nodeAddress = peerIdMultiaddress.nodeAddress();
    const address = {
      ip: nodeAddress.address,
      port: nodeAddress.port,
    };

    try {
      const proposeDealResponse = await callProposeDeal(toRpc(validDealProposal, p), {
        ...address,
        port: DEFAULT_LOCAL_RPC_ADDRESS.port, // We can't hardcode this but we can't do anything about it *right now*
      });

      await uploadFile(
        dealFile,
        proposeDealResponse,
        { ...address, port: DEFAULT_LOCAL_STORAGE_ADDRESS.port }, // We can't hardcode this but we can't do anything about it *right now*
      );

      if (!selectedAccount) {
        toast.error("No account selected");
        return;
      }

      const signedRpc = await createSignedRpc(validDealProposal, p, ctx.registry, selectedAccount);
      await callPublishDeal(
        signedRpc,
        { ...address, port: DEFAULT_LOCAL_RPC_ADDRESS.port }, // We can't hardcode this but we can't do anything about it *right now*
      );
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Unable to decode error message, check console for details.");
        console.error(error);
      }
      return;
    }
    toast.success(`Successfully uploaded file to ${p}`);
  };

  const Submit = () => {
    const submit = async () => {
      const validDealProposal = validateInput(dealProposal);
      if (!validDealProposal) {
        toast.error("Failed to validate deal proposal");
        return;
      }

      // TODO: figure out error handling here
      toast.promise(
        async () => {
          setLoading(true);
          await Promise.allSettled(
            Array.from(selectedProviders).map((provider) =>
              performDeal(provider, validDealProposal),
            ),
          );
          setLoading(false);
        },
        {
          loading: "Uploading deals",
        },
      );
    };

    const submitDisabled =
      !selectedAccount ||
      !validateInput(dealProposal) ||
      !dealFile ||
      selectedProviders.size === 0 ||
      loading;

    return (
      <div className={"pt-4"}>
        <button
          type="submit"
          className={`px-4 py-2 bg-blue-200 rounded-sm ${
            submitDisabled ? "bg-gray-400 cursor-not-allowed" : "hover:bg-blue-600"
          } ${loading ? "cursor-progress" : ""}`}
          onClick={submit}
          disabled={submitDisabled}
        >
          {loading ? "Loading..." : "Continue"}
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="flex bg-white rounded-lg shadow p-6 mb-4">
        <div>
          <h2 className="text-xl font-bold mb-4">Deal Creation</h2>
          <DealProposalForm
            dealProposal={dealProposal}
            onChange={setDealProposal}
            onFileSelect={setDealFile}
            selectedFile={dealFile}
            accounts={accounts}
            selectedAccount={selectedAccount}
            onSelectAccount={setSelectedAccount}
          />
          <Submit />
        </div>
        <div className="bg-black mx-8 min-w-px max-w-px" />
        <ProviderSelector
          providers={providers}
          setProviders={setProviders}
          selectedProviders={selectedProviders}
          onSelectProvider={updateProviderSelection}
        />
      </div>
      <Toaster position="bottom-right" reverseOrder={true} />
    </>
  );
}
