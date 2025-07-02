import type { Multiaddr } from "@multiformats/multiaddr";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import type { TypeRegistry } from "@polkadot/types";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { useOutletContext } from "react-router";
import { useCtx } from "../GlobalCtx";
import {
  DealProposalForm,
  calculateStartEndBlocks,
} from "../components/deal-proposal-form/DealProposalForm";
import type { FormValues } from "../components/deal-proposal-form/types";
import { createSignedRpc, toRpc } from "../lib/dealProposal";
import { createDownloadTrigger } from "../lib/download";
import { proposeDeal, publishDeal, uploadFile } from "../lib/fileUpload";
import { SubmissionReceipt } from "../lib/submissionReceipt";

type OutletContextType = {
  accounts: InjectedAccountWithMeta[];
};

type DealInfo = {
  proposal: FormValues;
  file: File;
  durationInBlocks: number;
  startBlock: number;
  endBlock: number;
};

type ProviderInfo = {
  accountId: string;
  multiaddr: Multiaddr;
  pricePerBlock: number;
};

type DealId = number;

async function executeDeal(
  accounts: InjectedAccountWithMeta[],
  providerInfo: ProviderInfo,
  dealInfo: DealInfo,
  registry: TypeRegistry,
): Promise<DealId> {
  const { address, port } = providerInfo.multiaddr.nodeAddress();

  const clientAccount = accounts.find((v) => v.address === dealInfo.proposal.client);
  if (!clientAccount) {
    throw new Error("Could not find a client account address");
  }

  const proposeDealResponse = await proposeDeal(
    toRpc(
      dealInfo.proposal,
      providerInfo.accountId,
      providerInfo.pricePerBlock,
      dealInfo.startBlock,
      dealInfo.endBlock,
    ),
    {
      ip: address,
      port: port,
    },
  );

  const response = await uploadFile(dealInfo.file, proposeDealResponse, {
    ip: address,
    port: port,
  });
  if (!response.ok) {
    throw new Error(response.statusText);
  }

  const signedRpc = await createSignedRpc(
    dealInfo.proposal,
    providerInfo.accountId,
    providerInfo.pricePerBlock,
    dealInfo.startBlock,
    dealInfo.endBlock,
    registry,
    clientAccount,
  );
  const dealId = await publishDeal(signedRpc, {
    ip: address,
    port: port,
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
    return await executeDeal(accounts, providerInfo, dealInfo, registry);
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

  const onSubmit = async (dealProposal: FormValues) =>
    await toast.promise(
      async () => {
        const { startBlock, endBlock, durationInBlocks } = calculateStartEndBlocks(
          latestFinalizedBlock.number,
          dealProposal.duration,
        );

        const dealInfo: DealInfo = {
          proposal: dealProposal,
          file: dealProposal.piece.file,
          durationInBlocks,
          startBlock,
          endBlock,
        };

        const submissionResults = SubmissionReceipt.new({
          deals: [],
          pieceCid: dealProposal.piece.pieceCid,
          payloadCid: dealProposal.piece.payloadCid,
          filename: dealProposal.piece.file.name,
          startBlock: startBlock,
          endBlock: endBlock,
        });

        // Using Promise.all here spams the user with N popups
        // where N is the number of storage providers the user is uploading deals to
        for (const spInfo of dealProposal.providers) {
          const providerInfo: ProviderInfo = {
            accountId: spInfo.accountId,
            multiaddr: spInfo.multiaddr,
            pricePerBlock: spInfo.dealParams.minimumPricePerBlock,
          };

          try {
            submissionResults.deals.push({
              storageProviderAccountId: providerInfo.accountId,
              storageProviderMultiaddr: providerInfo.multiaddr.toString(),
              dealId: await performDealToastWrapper(providerInfo, dealInfo),
            });
          } catch (err) {
            if (err instanceof Error) {
              console.error(err.message);
            } else {
              console.error(err);
            }
          }
        }

        if (submissionResults.deals.length === 0) {
          throw new Error("All deals failed. No receipt generated.");
        }

        createDownloadTrigger("deal.json", new Blob([JSON.stringify(submissionResults.toJSON())]));
      },
      {
        loading: "Submitting deals!",
        success: "Successfully submitted all deals!",
      },
    );

  return (
    <DealProposalForm
      currentBlock={latestFinalizedBlock.number}
      currentBlockTimestamp={latestFinalizedBlock.timestamp}
      accounts={accounts}
      onSubmit={onSubmit}
    />
  );
}
