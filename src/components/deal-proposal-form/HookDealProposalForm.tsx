import { yupResolver } from "@hookform/resolvers/yup";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { blockToTime, planckToDot } from "../../lib/conversion";
import { HookAccountSelector } from "./AccountSelector";
import { DisabledInputInfo } from "./DisabledInputInfo";
import { HookInput } from "./Input";
import { HookPieceUploader } from "./PieceUploader";
import type { IFormValues } from "./types";

const BLOCKS_IN_MINUTE = 10;
const OFFSET = BLOCKS_IN_MINUTE * 5;
const DEFAULT_DEAL_DURATION = 50;
const DEFAULT_MAX_PROVE_COMMIT_DURATION = 50;
const DEFAULT_MAX_DEAL_DURATION = 180 * BLOCKS_IN_MINUTE;

// TODO(@th7nder,16/04/2025): fetch from chain
// This is the minimum amount of blocks it'll take for the deal to be active.
const maxProveCommitDuration = DEFAULT_MAX_PROVE_COMMIT_DURATION;
// It's not in pallet metadata anymore, because of the benchmarks.
const minDealDuration = DEFAULT_DEAL_DURATION;
const maxDealDuration = DEFAULT_MAX_DEAL_DURATION;

export function HookDealProposalForm({
  currentBlock,
  currentBlockTimestamp,
  accounts,
}: {
  currentBlock: number;
  currentBlockTimestamp: Date;
  accounts: InjectedAccountWithMeta[];
}) {
  const schema = useMemo(() => {
    const schema = yup
      .object()
      .shape({
        piece: yup
          .object()
          .shape({
            cid: yup.string().required(),
            size: yup.number().required(),
            file: yup
              .mixed<File>()
              .required()
              .test("file-size", "File must be under 8MB", (value) => {
                return value && value.size <= 8 * 1024 * 1024;
              }),
          })
          .required(),
        label: yup.string().required(),
        startBlock: yup
          .number()
          .positive()
          .integer()
          .required()
          .test(
            "is-late-enough",
            `Must be at least ${maxProveCommitDuration} blocks in the future`,
            (value) => value > currentBlock + maxProveCommitDuration,
          ),
        endBlock: yup
          .number()
          .positive()
          .integer()
          .required()
          .test(
            "is-greater-than-start",
            "End block must be greater than start block",
            function (value) {
              return !this.parent.startBlock || value > this.parent.startBlock;
            },
          )
          .test(
            "is-long-enough",
            `Must be at least ${minDealDuration} blocks long`,
            function (value) {
              return !this.parent.startBlock || value - this.parent.startBlock >= minDealDuration;
            },
          )
          .test("is-too-long", `Must be at max ${maxDealDuration} blocks long`, function (value) {
            return !this.parent.startBlock || value - this.parent.startBlock <= maxDealDuration;
          }),
        pricePerBlock: yup.number().positive().integer().required(),
        providerCollateral: yup.number().positive().integer().required(),
        client: yup.string().required(),
      })
      .required();

    return schema;
  }, [currentBlock]);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IFormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      startBlock: currentBlock + OFFSET + maxProveCommitDuration,
      endBlock: currentBlock + OFFSET + minDealDuration + maxProveCommitDuration,
      pricePerBlock: 1000,
      providerCollateral: 100,
    },
  });

  // TODO(@th7nder,16/04/2025): sending this stuff
  const loading = false;

  const [startBlock, endBlock, pricePerBlock] = watch(["startBlock", "endBlock", "pricePerBlock"]);

  const duration = endBlock - startBlock;
  const startBlockRealTime = blockToTime(startBlock, currentBlock, currentBlockTimestamp);
  const endBlockRealTime = blockToTime(endBlock, currentBlock, currentBlockTimestamp);
  const totalPrice = duration * pricePerBlock;

  const onSubmit = (data: IFormValues) => console.log(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col min-w-md max-w-md">
        <div className="grid grid-cols-1 gap-4 mb-4">
          <HookAccountSelector id="client" register={register} accounts={accounts} />
          <HookPieceUploader
            error={
              errors.piece?.root || errors.piece?.file || errors.piece?.size || errors.piece?.cid
            }
            name="piece"
            control={control}
          />

          <HookInput
            id="label"
            register={register}
            error={errors.label}
            tooltip="A human-readable label for this storage deal"
            placeholder="a photo of my kitty"
          >
            Label*
          </HookInput>

          <i className="text-sm font-medium">Current block: {currentBlock}</i>
          <div className="flex flex-row items-start gap-4">
            <div className="w-1/2">
              <HookInput
                id="startBlock"
                register={register}
                error={errors.startBlock}
                type="number "
                tooltip="The block number of when the data is guaranteed to be available"
              >
                Start Block*
              </HookInput>
            </div>

            <DisabledInputInfo
              name="startBlockTime"
              value={startBlockRealTime.toLocaleString("en-GB")}
              label="Estimated real-time"
            />
          </div>

          <div className="flex flex-row items-start gap-4">
            <div className="w-1/2">
              <HookInput
                id="endBlock"
                register={register}
                error={errors.endBlock}
                type="number"
                tooltip="The block number when the data ends to be available"
              >
                End Block*
              </HookInput>
            </div>
            <DisabledInputInfo
              name="endBlockTime"
              value={endBlockRealTime.toLocaleString("en-GB")}
              label="Estimated real-time"
            />
          </div>

          <div className="flex flex-row items-center gap-4">
            <HookInput
              id="pricePerBlock"
              register={register}
              error={errors.pricePerBlock}
              type="number"
              tooltip="The amount you'll pay for each block your data is stored"
            >
              Price-per-Block*
            </HookInput>

            <HookInput
              id="providerCollateral"
              register={register}
              error={errors.providerCollateral}
              type="number"
              tooltip="Amount the storage provider must stake as collateral to ensure they fulfill the deal"
            >
              Provider Collateral*
            </HookInput>
          </div>
        </div>

        {totalPrice > 0 && (
          <div className="p-3 mb-4 bg-blue-50 border border-blue-200 rounded">
            <p className="font-semibold text-sm">
              Total Deal Price: <span className="text-blue-600">{totalPrice}</span> Planck (
              <span className="text-blue-600">{planckToDot(totalPrice)}</span> DOT)
            </p>
            <p className="text-xs text-gray-500">
              ({duration} blocks × {pricePerBlock} per block)
            </p>
          </div>
        )}

        <div className={"pt-4"}>
          <input
            type="submit"
            className={`px-4 py-2 bg-blue-200 rounded-sm "hover:bg-blue-600" ${loading ? "cursor-progress" : ""}`}
            value="Continue"
          />
        </div>
      </div>
    </form>
  );
}
