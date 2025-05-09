import type { ApiPromise } from "@polkadot/api";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useCtx } from "../../GlobalCtx";
import type { OnChainDealProposal, OnChainDealState } from "../../lib/jsonRpc";
import type { SubmissionReceipt } from "../../lib/submissionReceipt";

enum LoadState {
  Idle = 0,
  Loaded = 1,
  Loading = 2,
  Error = 3,
}

type State =
  | { status: LoadState.Idle }
  | {
      status: LoadState.Loading;
    }
  | { status: LoadState.Loaded; deals: Array<[number, OnChainDealProposal | null]> }
  | { status: LoadState.Error; message: string };

namespace State {
  export function isLoading(state: State): boolean {
    return state.status === LoadState.Loading;
  }

  export function loading(): State {
    return { status: LoadState.Loading };
  }

  export function idle(): State {
    return { status: LoadState.Idle };
  }

  export function error(message: string): State {
    return { status: LoadState.Error, message };
  }

  export function loaded(deals: Array<[number, OnChainDealProposal | null]>): State {
    return { status: LoadState.Loaded, deals };
  }
}

const queryDealStatus = async (
  dealIds: number[],
  collatorWsApi: ApiPromise,
): Promise<Array<[number, OnChainDealProposal | null]>> => {
  const queries = dealIds.map((id) => {
    return [collatorWsApi.query.market.proposals, id];
  });
  // @ts-ignore: queries is marked with the wrong type but it's correct
  const results = await collatorWsApi.queryMulti(queries);
  // @ts-ignore: again, we know better than TS
  return results.map((result, idx) => [dealIds[idx], result.toJSON()]);
};

function DealState({ id, state }: { id: number; state: OnChainDealState | null }) {
  if (!state) {
    return (
      <>
        <span className="font-bold">Deal {id}</span>
        {": Not found!"}
      </>
    );
  }

  if ("published" in state) {
    return (
      <>
        <span className="font-bold">Deal {id}</span>
        {": was published, but not proven, it will not be available for retrieval!"}
      </>
    );
  }

  return (
    <>
      <span className="font-bold">Deal {id}</span>
      {`: active since block ${state.active.sectorStartBlock}, available for retrieval.`}
    </>
  );
}

type DealStatusProps = { receipt: SubmissionReceipt };
export function DealStatus({ receipt }: DealStatusProps) {
  const { collatorWsApi } = useCtx();

  const [dealsStatus, setDealsStatus] = useState<State>(State.idle());

  const query = useCallback(
    async (receipt: SubmissionReceipt) => {
      if (!collatorWsApi) {
        throw new Error("Collator connection not initialized");
      }

      try {
        setDealsStatus(State.loading());
        await toast.promise(
          async () => {
            const deals = await queryDealStatus(
              receipt.deals.map((deal) => deal.dealId),
              collatorWsApi,
            );
            setDealsStatus(State.loaded(deals));
          },
          { loading: "Fetching deal status" },
        );
      } catch (error) {
        if (error instanceof Error) {
          setDealsStatus(State.error(error.message));
        } else {
          // This ain't great but what can we do here?
          setDealsStatus(State.error(JSON.stringify(error)));
        }
      }
    },
    [collatorWsApi],
  );

  useEffect(() => {
    query(receipt);
  }, [query, receipt]);

  return (
    <div className="flex flex-col gap-2">
      {/* <Button disabled={State.isLoading(dealsStatus)} onClick={query}>
        Query receipt deals
      </Button> */}

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
                  {dealsStatus.deals.map(([id, deal]) => {
                    return (
                      <li className="list-disc list-inside" key={id}>
                        <DealState id={id} state={deal?.state ?? null} />
                      </li>
                    );
                  })}
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
