import { type Multiaddr, type NodeAddress, multiaddr } from "@multiformats/multiaddr";
import type { ApiPromise, WsProvider } from "@polkadot/api";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import type { TypeRegistry } from "@polkadot/types";
import { Loader2 } from "lucide-react";
import { CID } from "multiformats/cid";
import { toast } from "react-hot-toast";
import { useOutletContext } from "react-router";
import { useCtx } from "../GlobalCtx";
import { DealProposalForm } from "../components/deal-proposal-form/DealProposalForm";
import type { IFormValues } from "../components/deal-proposal-form/types";
import { createSignedRpc, toRpc } from "../lib/dealProposal";
import { createDownloadTrigger } from "../lib/download";
import { uploadFile } from "../lib/fileUpload";
import { callProposeDeal, callPublishDeal } from "../lib/jsonRpc";
import { queryPeerId } from "../lib/p2p/bootstrapRequestResponse";
import { Services } from "../lib/p2p/servicesRequestResponse";

type OutletContextType = {
  accounts: InjectedAccountWithMeta[];
};

// This is not great
type DealResult = {
  storageProviderPeerId: string;
  storageProviderAccountId: string;
  dealId: number;
};

class SubmissionResult {
  deals: DealResult[];
  pieceCid: CID;
  filename: string;
  startBlock: number;
  endBlock: number;

  constructor(
    deals: DealResult[],
    pieceCid: CID,
    filename: string,
    startBlock: number,
    endBlock: number,
  ) {
    this.deals = deals;
    this.pieceCid = pieceCid;
    this.filename = filename;
    this.startBlock = startBlock;
    this.endBlock = endBlock;
  }

  toJSON(): object {
    return {
      ...this,
      pieceCid: this.pieceCid.toString(),
    };
  }
}

type DealInfo = {
  proposal: IFormValues;
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
  accounts: InjectedAccountWithMeta[],
  providerInfo: ProviderInfo,
  dealInfo: DealInfo,
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

  const clientAccount = accounts.find((v) => v.address === dealInfo.proposal.client);
  if (!clientAccount) {
    throw new Error("Could not find a client accoutn address");
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
      throw new Error("Collator chain connetion not setup!");
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

  const onSubmit = async (dealProposal: IFormValues) =>
    await toast.promise(
      async () => {
        const dealInfo: DealInfo = {
          proposal: dealProposal,
          file: dealProposal.piece.file,
        };

        const submissionResults = new SubmissionResult(
          [],
          CID.parse(dealProposal.piece.pieceCid),
          dealProposal.piece.file.name,
          dealProposal.startBlock,
          dealProposal.endBlock,
        );
        // Using Promise.all here spams the user with N popups
        // where N is the number of storage providers the user is uploading deals to
        for (const spInfo of dealProposal.providers) {
          const providerInfo: ProviderInfo = {
            accountId: spInfo.accountId,
            peerId: spInfo.peerId,
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
