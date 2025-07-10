import type { PolkaStorageQueries } from "@polkadot-api/descriptors";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useCtx } from "../../GlobalCtx";
import type { PolkaStorageApi } from "../../GlobalCtx";
import { formatDuration, secondsToDuration } from "../../lib/conversion";
import type { SubmissionReceipt } from "../../lib/submissionReceipt";

type DealProposal = PolkaStorageQueries["StorageProvider"]["Proposals"]["Value"];

enum LoadState {
  Idle = 0,
  Loaded = 1,
  Loading = 2,
  Error = 3,
}

type State =
  | { status: LoadState.Idle }
  | { status: LoadState.Loading }
  | { status: LoadState.Error; message: string }
  | { status: LoadState.Loaded; deals: [bigint, DealProposal | null][] };

namespace State {
  export const isLoading = (state: State) => state.status === LoadState.Loading;
  export const loading = (): State => ({ status: LoadState.Loading });
  export const idle = (): State => ({ status: LoadState.Idle });
  export const error = (message: string): State => ({ status: LoadState.Error, message });
  export const loaded = (deals: Array<[bigint, DealProposal | null]>): State => ({
    status: LoadState.Loaded,
    deals,
  });
}

const queryDealStatus = async (
  dealIds: bigint[],
  papiTypedApi: PolkaStorageApi,
): Promise<Array<[bigint, DealProposal | null]>> => {
  const keys: [bigint][] = dealIds.map((id) => [id]);
  const values = await papiTypedApi.query.StorageProvider.Proposals.getValues(keys);
  // @ts-ignore
  return values.map((value, idx) => [dealIds[idx], value ?? null]);
};

function DealState({ id, deal }: { id: bigint; deal: DealProposal | null }) {
  if (!deal) {
    return (
      <>
        <span className="font-bold">Deal {id.toString()}</span>
        {": Not found!"}
      </>
    );
  }

  const state = deal.state;

  if (state.type === "Published") {
    return (
      <>
        <span className="font-bold">Deal {id.toString()}</span>
        {": was published, but not proven, it will not be available for retrieval!"}
      </>
    );
  }

  if (state.type === "Active" && state.value) {
    const startBlock = state.value.sector_start_block;
    const endBlock = deal.end_block;

    const dealDurationInBlocks = endBlock - startBlock;
    const dealDurationInSeconds = dealDurationInBlocks * 6;
    const dealDuration = secondsToDuration(dealDurationInSeconds);
    const duration = formatDuration(dealDuration);

    return (
      <>
        <span className="font-bold">Deal {id.toString()}</span>
        {`: active since block ${startBlock}, retrieval is available until block ${endBlock} `}
        <span className="italic">(approximately {duration})</span>.
      </>
    );
  }

  return (
    <>
      <span className="font-bold">Deal {id.toString()}</span>
      {": Unknown state"}
    </>
  );
}

type DealStatusProps = {
  receipt: SubmissionReceipt;
  onCanDownload: (canDownload: boolean) => void;
};

export function DealStatus({ receipt, onCanDownload }: DealStatusProps) {
  const { papiTypedApi } = useCtx();
  const [dealsStatus, setDealsStatus] = useState<State>(State.idle());

  const query = useCallback(
    async (receipt: SubmissionReceipt) => {
      if (!papiTypedApi) {
        throw new Error("papiTypedApi not initialized");
      }

      try {
        setDealsStatus(State.loading());
        await toast.promise(
          async () => {
            const dealIds = receipt.deals.map((deal) => BigInt(deal.dealId));
            const deals = await queryDealStatus(dealIds, papiTypedApi);
            setDealsStatus(State.loaded(deals));

            const canDownload = deals.some(([, deal]) => deal?.state?.type === "Active");
            onCanDownload(canDownload);
          },
          { loading: "Fetching deal status" },
        );
      } catch (error) {
        setDealsStatus(State.error(error instanceof Error ? error.message : JSON.stringify(error)));
        if (onCanDownload) onCanDownload(false);
      }
    },
    [papiTypedApi, onCanDownload],
  );

  useEffect(() => {
    query(receipt);
  }, [query, receipt]);

  return (
    <div className="flex flex-col gap-2">
      {(() => {
        switch (dealsStatus.status) {
          case LoadState.Error:
            return (
              <>
                <p className="text-400-red">
                  Failed to query deal status with error: {`${dealsStatus.message}`}
                </p>
                <hr className="stroke-1" />
              </>
            );
          case LoadState.Loaded:
            return (
              <>
                <ul>
                  {dealsStatus.deals.map(([id, deal]) => (
                    <li className="list-disc list-inside" key={id.toString()}>
                      <DealState id={id} deal={deal} />
                    </li>
                  ))}
                </ul>

                <hr className="stroke-1" />
              </>
            );
          default:
            return <></>;
        }
      })()}
    </div>
  );
}
