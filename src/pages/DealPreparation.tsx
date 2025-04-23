import type { NodeAddress } from "@multiformats/multiaddr";
import type { ApiPromise, WsProvider } from "@polkadot/api";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import type { TypeRegistry } from "@polkadot/types";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useOutletContext } from "react-router";
import { useCtx } from "../GlobalCtx";
import { DealProposalForm } from "../components/deal-proposal-form/DealProposalForm";
import type { FormValues } from "../components/deal-proposal-form/types";
import { createSignedRpc, toRpc } from "../lib/dealProposal";
import { createDownloadTrigger } from "../lib/download";
import { uploadFile } from "../lib/fileUpload";
import { callProposeDeal, callPublishDeal } from "../lib/jsonRpc";
import { Services } from "../lib/p2p/servicesRequestResponse";
import { resolvePeerIdMultiaddrs } from "../lib/resolvePeerIdMultiaddr";
import { SubmissionReceipt } from "../lib/submissionReceipt";

type OutletContextType = {
  accounts: InjectedAccountWithMeta[];
};

type DealInfo = {
  proposal: FormValues;
  file: File;
};

type ProviderInfo = {
  accountId: string;
  peerId: string;
  pricePerBlock: number;
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

async function executeDeal(
  accounts: InjectedAccountWithMeta[],
  providerInfo: ProviderInfo,
  dealInfo: DealInfo,
  collator: Collator,
  registry: TypeRegistry,
): Promise<DealId> {
  const peerIdMultiaddress = await resolvePeerIdMultiaddrs(collator, providerInfo.peerId);

  // TODO(@th7nder,18/04/2025): https://github.com/eigerco/polka-storage/issues/835
  // Collateral hardcoded as 2 * total deal price.
  // It should be set on-chain not here.
  const collateral =
    2 * (dealInfo.proposal.endBlock - dealInfo.proposal.startBlock) * providerInfo.pricePerBlock;

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

  const clientAccount = accounts.find((v) => v.address === dealInfo.proposal.client);
  if (!clientAccount) {
    throw new Error("Could not find a client account address");
  }

  const proposeDealResponse = await callProposeDeal(
    toRpc(dealInfo.proposal, providerInfo.accountId, providerInfo.pricePerBlock, collateral),
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
    providerInfo.pricePerBlock,
    collateral,
    registry,
    clientAccount,
  );
  const dealId = await callPublishDeal(signedRpc, {
    ip: targetStorageProvider.address.address,
    port: targetStorageProvider.services.rpc.port,
  });

  return dealId;
}

export function DealPreparation() {
  const { accounts } = useOutletContext<OutletContextType>();
  const { latestFinalizedBlock, collatorWsApi, collatorWsProvider, registry } = useCtx();

  const performDeal = async (providerInfo: ProviderInfo, dealInfo: DealInfo): Promise<DealId> => {
    if (!collatorWsProvider) {
      throw new Error("Collator WS provider not setup!");
    }
    if (!collatorWsApi) {
      throw new Error("Collator chain connection not setup!");
    }
    const collator: Collator = {
      wsProvider: collatorWsProvider,
      apiPromise: collatorWsApi,
    };

    return await executeDeal(accounts, providerInfo, dealInfo, collator, registry);
  };

  const performDealToastWrapper = async (
    providerInfo: ProviderInfo,
    dealInfo: DealInfo,
  ): Promise<DealId> => {
    return await toast.promise(
      async () => {
        return await performDeal(providerInfo, dealInfo);
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

  const onSubmit = async (dealProposal: FormValues) =>
    await toast.promise(
      async () => {
        const dealInfo: DealInfo = {
          proposal: dealProposal,
          file: dealProposal.piece.file,
        };

        const submissionResults = SubmissionReceipt.new({
          deals: [],
          pieceCid: dealProposal.piece.pieceCid,
          payloadCid: dealProposal.piece.payloadCid,
          filename: dealProposal.piece.file.name,
          startBlock: dealProposal.startBlock,
          endBlock: dealProposal.endBlock,
        });
        // Using Promise.all here spams the user with N popups
        // where N is the number of storage providers the user is uploading deals to
        for (const spInfo of dealProposal.providers) {
          const providerInfo: ProviderInfo = {
            accountId: spInfo.accountId,
            peerId: spInfo.peerId,
            pricePerBlock: spInfo.dealParams.minimumPricePerBlock,
          };

          submissionResults.deals.push({
            storageProviderAccountId: providerInfo.accountId,
            storageProviderPeerId: providerInfo.peerId,
            dealId: await performDealToastWrapper(providerInfo, dealInfo),
          });
        }

        createDownloadTrigger("deal.json", new Blob([JSON.stringify(submissionResults.toJSON())]));
      },
      {
        loading: "Submitting deals!",
        success: "Successfully submitted all deals!",
      },
    );

  if (!latestFinalizedBlock) {
    return (
      <div className="text-center py-8">
        <Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-500 mb-4" />
        <p className="text-gray-600">Loading on-chain data...</p>
      </div>
    );
  }

  return (
    <DealProposalForm
      currentBlock={latestFinalizedBlock.number}
      currentBlockTimestamp={latestFinalizedBlock.timestamp}
      accounts={accounts}
      onSubmit={onSubmit}
    />
  );
}
