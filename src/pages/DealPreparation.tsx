import { type NodeAddress, multiaddr } from "@multiformats/multiaddr";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import type { u64 } from "@polkadot/types";
import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useOutletContext } from "react-router";
import { useCtx } from "../GlobalCtx";
import { DealProposalForm } from "../components/DealProposalForm";
import { ProviderSelector } from "../components/ProviderSelector";
import {
  DEFAULT_INPUT,
  type InputFields,
  type ValidatedFields,
  createSignedRpc,
  toRpc,
  validateInput,
} from "../lib/dealProposal";
import { uploadFile } from "../lib/fileUpload";
import { PolkaCollatorRpc, StorageProviderRpc } from "../lib/jsonRpc";
import { queryPeerId } from "../lib/p2p/bootstrapRequestResponse";
import { Services } from "../lib/p2p/servicesRequestResponse";
import type { StorageProviderInfo } from "../lib/storageProvider";

type OutletContextType = {
  accounts: InjectedAccountWithMeta[];
  selectedAccount: InjectedAccountWithMeta | null;
  setSelectedAccount: (account: InjectedAccountWithMeta) => void;
};

// Give user 5 minutes to think before submitting.
const BLOCKS_IN_MINUTE = 10;
const OFFSET = BLOCKS_IN_MINUTE * 5;
const DEFAULT_DEAL_DURATION = 50;
const DEFAULT_MAX_PROVE_COMMIT_DURATION = 50;

export function DealPreparation() {
  const { accounts, selectedAccount, setSelectedAccount } = useOutletContext<OutletContextType>();
  const { latestFinalizedBlock, collatorWsApi, wsAddress, registry } = useCtx();

  // This is the minimum amount of blocks it'll take for the deal to be active.
  const maxProveCommitDuration =
    (collatorWsApi?.consts.storageProvider.maxProveCommitDuration as u64).toNumber() ||
    DEFAULT_MAX_PROVE_COMMIT_DURATION;

  const minDealDuration =
    (collatorWsApi?.consts.market.minDealDuration as u64).toNumber() || DEFAULT_DEAL_DURATION;

  const [dealProposal, setDealProposal] = useState<InputFields>({
    ...DEFAULT_INPUT,
    startBlock: latestFinalizedBlock
      ? (latestFinalizedBlock.number + OFFSET + maxProveCommitDuration).toString()
      : "100",
    endBlock: latestFinalizedBlock
      ? (latestFinalizedBlock.number + OFFSET + maxProveCommitDuration + minDealDuration).toString()
      : "150",
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

  const performDeal = async (p: string, validDealProposal: ValidatedFields) => {
    // Inner function to avoid misuse, this should only be used inside the toast.promise
    // Throws inside this function are acceptable as they will be caught by the toast.promise and shown as such
    const inner = async (p: string, validDealProposal: ValidatedFields) => {
      if (!dealFile) {
        // NOTE: This should never happen unless the "Continue" button is wrong
        throw new Error("No file was selected");
      }

      if (!selectedAccount) {
        throw new Error("No account selected");
      }

      // We can make a function out of this and use Promise.all for more efficiency
      const provider = providers.get(p);
      if (!provider) {
        // NOTE: this shouldn't really happen unless state management is wrong
        throw new Error("Selected provider does not exist");
      }

      const collatorMaddrs = await PolkaCollatorRpc.getP2PMultiaddrs(wsAddress);
      const wsMaddrs = collatorMaddrs
        .filter((maddr) => maddr.includes("ws"))
        .map(multiaddr)
        .at(0);
      if (!wsMaddrs) {
        throw new Error("Could not find the services required to resolve the peer id");
      }

      // Hack: since there's no way to replace parts of multiaddrs, we need to do it by hand
      // we convert to a string, replace the "0.0.0.0" which is what we're expecting and recreate the multiaddr
      const queryAddr = multiaddr(
        wsMaddrs
          .toString()
          // biome-ignore lint/style/noNonNullAssertion: wsAddress should be valid at this point
          .replace("0.0.0.0", URL.parse(wsAddress)!.hostname),
      );

      const providerPeerId = provider.peerId;
      const peerIdMultiaddress = await queryPeerId(providerPeerId, queryAddr);
      if (!peerIdMultiaddress) {
        throw new Error(`Failed to find multiaddress for PeerId: ${providerPeerId}`);
      }

      let targetStorageProvider:
        | {
            services: Services.StorageProviderServices;
            address: NodeAddress;
          }
        | undefined;
      for (const maddr of peerIdMultiaddress) {
        const response = await Services.sendRequest("All", maddr);
        if (Services.isStorageProviderService(response.services)) {
          targetStorageProvider = {
            services: response.services,
            address: maddr.nodeAddress(),
          };
          break;
        }
      }

      if (!targetStorageProvider) {
        throw new Error("Could not find an address to upload the files to.");
      }

      const proposeDealResponse = await StorageProviderRpc.callProposeDeal(
        toRpc(validDealProposal, p),
        {
          ip: targetStorageProvider.address.address,
          port: targetStorageProvider.services.rpc.port,
        },
      );

      await uploadFile(dealFile, proposeDealResponse, {
        ip: targetStorageProvider.address.address,
        port: targetStorageProvider.services.upload.port,
      });

      const signedRpc = await createSignedRpc(validDealProposal, p, registry, selectedAccount);
      await StorageProviderRpc.callPublishDeal(signedRpc, {
        ip: targetStorageProvider.address.address,
        port: targetStorageProvider.services.rpc.port,
      });
    };

    await toast.promise(
      async () => {
        setLoading(true);
        await inner(p, validDealProposal);
        setLoading(false);
      },
      {
        loading: `Uploading deal to provider ${p}`,
        error: (err) => `Failed to upload deal to provider ${p} with error: ${err}`,
        success: `Successfully uploaded deal to provider ${p}`,
      },
      {
        success: {
          // Extend the duration to match the others
          // so the user has more time to check successes
          duration: 4000,
        },
      },
    );
  };

  const Submit = () => {
    const submit = async () => {
      const validDealProposal = validateInput(dealProposal);
      if (!validDealProposal) {
        toast.error("Failed to validate deal proposal");
        return;
      }

      for (const provider of selectedProviders) {
        // Using Promise.all here spams the user with N popups
        // where N is the number of storage providers the user is uploading deals to
        await performDeal(provider, validDealProposal);
      }
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

  if (!latestFinalizedBlock) {
    return (
      <div className="text-center py-8">
        <Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-500 mb-4" />
        <p className="text-gray-600">Loading on-chain data...</p>
      </div>
    );
  }

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
            currentBlock={latestFinalizedBlock.number}
            currentBlockTimestamp={latestFinalizedBlock.timestamp}
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
