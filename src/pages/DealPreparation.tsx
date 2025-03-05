import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useCallback, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useCtx } from "../GlobalCtx";
import { DealProposalForm } from "../components/DealProposalForm";
import { ProviderSelector } from "../components/ProviderSelector";
import { Input as DealProposal, type Validated } from "../lib/dealProposal";
import { uploadFile } from "../lib/fileUpload";
import { callProposeDeal, callPublishDeal } from "../lib/jsonRpc";
import { queryPeerId } from "../lib/requestResponse";

export function DealPreparation({
  account,
}: {
  account: InjectedAccountWithMeta;
}) {
  const [dealProposal, setDealProposal] = useState(
    DealProposal.default().copyUpdate("client", account.address),
  );

  const [dealFile, setDealFile] = useState<File | null>(null);
  const [providers, setProviders] = useState(new Map<string, object>());
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

  const performDeal = async (p: string, validDealProposal: Validated) => {
    // We can make a function out of this and use Promise.all for more efficiency
    const provider = providers.get(p);
    if (!provider) {
      // NOTE: this shouldn't really happen unless state management is wrong
      throw new Error("Selected provider does not exist");
    }

    // TODO: type this
    const providerPeerId = provider.peerId;
    // TODO: catch the error?
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

    const proposeDealResponse = await callProposeDeal(validDealProposal.toRpc(p), {
      ...address,
      port: 8000, // We can't hardcode this but we can't do anything about it *right now*
    });

    if (proposeDealResponse instanceof Error) {
      toast.error(proposeDealResponse.message);
      return;
    }

    if (!dealFile) {
      // NOTE: This should never happen unless the "Continue" button is wrong
      throw new Error("No file was selected");
    }
    await uploadFile(
      dealFile,
      proposeDealResponse,
      { ...address, port: 8001 }, // We can't hardcode this but we can't do anything about it *right now*
    );

    const signedRpc = await validDealProposal.toSignedRpc(p, ctx.registry, account);
    const publishDealResponse = await callPublishDeal(
      signedRpc,
      { ...address, port: 8000 }, // We can't hardcode this but we can't do anything about it *right now*
    );
    if (publishDealResponse instanceof Error) {
      toast.error(publishDealResponse.message);
      return;
    }
    toast.success(`Successfully uploaded file to ${p}`);
  };

  const Submit = () => {
    const submit = async () => {
      const validDealProposal = dealProposal.validate();
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
      !dealProposal.validate() || !dealFile || selectedProviders.size === 0 || loading;

    return (
      <div className={"pt-8"}>
        <button
          type="submit"
          className={`px-4 py-2 bg-blue-200 rounded-sm ${
            submitDisabled ? "bg-gray-400 cursor-not-allowed" : "hover:bg-blue-600"
          }`}
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
      <div className="flex">
        <DealProposalForm
          dealProposal={dealProposal}
          onChange={setDealProposal}
          onFileSelect={setDealFile}
          selectedFile={dealFile}
        />
        <div className="bg-black mx-8" style={{ width: "1px" }} />
        <ProviderSelector
          providers={providers}
          setProviders={setProviders}
          selectedProviders={selectedProviders}
          onSelectProvider={updateProviderSelection}
        />
      </div>
      <Submit />
      <Toaster position="bottom-right" reverseOrder={true} />
    </>
  );
}
