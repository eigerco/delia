import { type Multiaddr, type NodeAddress, multiaddr } from "@multiformats/multiaddr";
import type { ApiPromise, WsProvider } from "@polkadot/api";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import type { TypeRegistry, u64 } from "@polkadot/types";
import { Loader2 } from "lucide-react";
import { CID } from "multiformats/cid";
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
import { createDownloadTrigger } from "../lib/download";
import { uploadFile } from "../lib/fileUpload";
import { callProposeDeal, callPublishDeal } from "../lib/jsonRpc";
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

// This is not great
type DealResult = {
  storageProviderPeerId: string;
  storageProviderAccountId: string;
  dealId: number;
};

class SubmissionResult {
  deals: DealResult[];
  payloadCid: CID;
  pieceCid: CID;
  filename: string;
  startBlock: number;
  endBlock: number;

  constructor(
    deals: DealResult[],
    payloadCid: CID,
    pieceCid: CID,
    filename: string,
    startBlock: number,
    endBlock: number,
  ) {
    this.deals = deals;
    this.payloadCid = payloadCid;
    this.pieceCid = pieceCid;
    this.filename = filename;
    this.startBlock = startBlock;
    this.endBlock = endBlock;
  }

  toJSON(): object {
    return {
      ...this,
      payloadCid: this.payloadCid.toString(),
      pieceCid: this.pieceCid.toString(),
    };
  }
}

type DealInfo = {
  proposal: ValidatedFields;
  file: File;
};

type ProviderInfo = {
  accountId: string;
  peerId: string;
};

type DealId = number;

type Collator = {
  wsProvider: WsProvider;
  apiPromise: ApiPromise;
};

// CAR metadata returned by the FileUploader
export type CarMetadata = {
  payloadCid: string;
  pieceSize: number;
  // CommP
  pieceCid: string;
};

export type FileWithMetadata = {
  file: File;
  metadata: CarMetadata;
};

async function resolvePeerIdMultiaddrs(collator: Collator, peerId: string): Promise<Multiaddr[]> {
  const collatorMaddrs: string[] = await collator.wsProvider.send(
    "polkaStorage_getP2pMultiaddrs",
    [],
  );
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
      .replace("0.0.0.0", URL.parse(collator.wsProvider.endpoint)!.hostname), // double check this
  );

  const peerIdMultiaddress = await queryPeerId(peerId, queryAddr);
  if (!peerIdMultiaddress) {
    throw new Error(`Failed to find multiaddress for PeerId: ${peerId}`);
  }
  return peerIdMultiaddress;
}

async function executeDeal(
  providerInfo: ProviderInfo,
  dealInfo: DealInfo,
  account: InjectedAccountWithMeta,
  collator: Collator,
  registry: TypeRegistry,
): Promise<DealId> {
  const peerIdMultiaddress = await resolvePeerIdMultiaddrs(collator, providerInfo.peerId);

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

  const proposeDealResponse = await callProposeDeal(
    toRpc(dealInfo.proposal, providerInfo.accountId),
    {
      ip: targetStorageProvider.address.address,
      port: targetStorageProvider.services.rpc.port,
    },
  );

  const response = await uploadFile(dealInfo.file, proposeDealResponse, {
    ip: targetStorageProvider.address.address,
    port: targetStorageProvider.services.upload.port,
  });
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const signedRpc = await createSignedRpc(
    dealInfo.proposal,
    providerInfo.accountId,
    registry,
    account,
  );
  const dealId = await callPublishDeal(signedRpc, {
    ip: targetStorageProvider.address.address,
    port: targetStorageProvider.services.rpc.port,
  });

  return dealId;
}

export function DealPreparation() {
  const { accounts, selectedAccount, setSelectedAccount } = useOutletContext<OutletContextType>();
  const { latestFinalizedBlock, collatorWsApi, collatorWsProvider, registry } = useCtx();

  // This is the minimum amount of blocks it'll take for the deal to be active.
  const maxProveCommitDuration =
    (collatorWsApi?.consts.storageProvider.maxProveCommitDuration as u64).toNumber() ||
    DEFAULT_MAX_PROVE_COMMIT_DURATION;

  // It's not in pallet metadata anymore, because of the benchmarks.
  const minDealDuration = DEFAULT_DEAL_DURATION;

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

  const [dealFile, setDealFile] = useState<FileWithMetadata | null>(null);
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

  const performDeal = async (providerInfo: ProviderInfo, dealInfo: DealInfo): Promise<DealId> => {
    if (!selectedAccount) {
      throw new Error("No account was selected!");
    }

    if (!collatorWsProvider) {
      throw new Error("Collator WS provider not setup!");
    }
    if (!collatorWsApi) {
      throw new Error("Collator chain connetion not setup!");
    }
    const collator: Collator = {
      wsProvider: collatorWsProvider,
      apiPromise: collatorWsApi,
    };

    return await executeDeal(providerInfo, dealInfo, selectedAccount, collator, registry);
  };

  const performDealToastWrapper = async (
    providerInfo: ProviderInfo,
    dealInfo: DealInfo,
  ): Promise<DealId> => {
    return await toast.promise(
      async () => {
        setLoading(true);
        try {
          return await performDeal(providerInfo, dealInfo);
        } finally {
          setLoading(false);
        }
      },
      {
        loading: `Uploading deal to provider ${providerInfo.accountId}`,
        error: (err) => (
          <p>{`Failed to upload deal to provider ${providerInfo.accountId} with error: ${err}`}</p>
        ),
        success: `Successfully uploaded deal to provider ${providerInfo.accountId}`,
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
    const submit = async () =>
      await toast.promise(
        async () => {
          const validDealProposal = validateInput(dealProposal);
          if (!validDealProposal) {
            throw new Error("Failed to validate deal proposal");
          }
          if (!dealFile) {
            throw new Error("No file was provided!");
          }
          const dealInfo: DealInfo = {
            proposal: validDealProposal,
            file: dealFile.file,
          };
          const payloadCid = CID.parse(dealFile.metadata.payloadCid);
          if (!payloadCid) {
            throw new Error("Invalid payload CID");
          }

          const submissionResults = new SubmissionResult(
            [],
            payloadCid,
            validDealProposal.pieceCid,
            dealFile.file.name,
            validDealProposal.startBlock,
            validDealProposal.endBlock,
          );
          // Using Promise.all here spams the user with N popups
          // where N is the number of storage providers the user is uploading deals to
          for (const providerAccountId of selectedProviders) {
            const spInfo = providers.get(providerAccountId);
            if (!spInfo) {
              throw new Error(`Unable to find information for provider ${providerAccountId}`);
            }
            const providerInfo: ProviderInfo = {
              accountId: providerAccountId,
              peerId: spInfo.peerId,
            };

            submissionResults.deals.push({
              storageProviderAccountId: providerInfo.accountId,
              storageProviderPeerId: providerInfo.peerId,
              dealId: await performDealToastWrapper(providerInfo, dealInfo),
            });
          }

          createDownloadTrigger(
            "deal.json",
            new Blob([JSON.stringify(submissionResults.toJSON())]),
          );
        },
        {
          loading: "Submitting deals!",
          success: "Successfully submitted all deals!",
        },
      );

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
