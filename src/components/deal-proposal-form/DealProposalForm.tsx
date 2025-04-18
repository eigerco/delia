import { zodResolver } from "@hookform/resolvers/zod";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Toaster } from "react-hot-toast";
import { z } from "zod";
import { blockToTime, planckToDot } from "../../lib/conversion";
import { type StorageProviderInfo, isStorageProviderInfo } from "../../lib/storageProvider";
import { HookAccountSelector } from "./AccountSelector";
import { DisabledInputInfo } from "./DisabledInputInfo";
import { HookInput } from "./Input";
import { PieceUploader } from "./PieceUploader";
import { ProviderSelector } from "./ProviderSelector";
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

const storageProviderInfoSchema = z.custom<StorageProviderInfo>(isStorageProviderInfo);

function validationSchema(currentBlock: number) {
  return z
    .object({
      piece: z.object({
        pieceCid: z.string(),
        payloadCid: z.string(),
        size: z.number(),
        file: z.instanceof(File).refine((file: File) => file.size <= 8 * 1024 * 1024, {
          message: "File must be under 8MB",
        }),
      }),
      label: z.string().max(128),
      startBlock: z.coerce
        .number()
        .int()
        .positive()
        .refine((value) => value > currentBlock + maxProveCommitDuration, {
          message: `Must be at least ${maxProveCommitDuration} blocks in the future`,
        }),
      endBlock: z.coerce.number().int().positive(),
      pricePerBlock: z.coerce.number().int().positive(),
      providerCollateral: z.coerce.number().int().positive(),
      client: z.string(),
      providers: z
        .array(storageProviderInfoSchema)
        .min(1, "There must be at least 1 Storage Provider selected"),
    })
    .refine((data) => data.endBlock > data.startBlock, {
      message: "End block must be greater than start block",
      path: ["endDate"],
    })
    .refine((data) => data.endBlock - data.startBlock >= minDealDuration, {
      message: "Must be at least ${minDealDuration} blocks long",
      path: ["endDate"],
    })
    .refine((data) => data.endBlock - data.startBlock <= maxDealDuration, {
      message: "Must be at max ${maxDealDuration} blocks long",
      path: ["endDate"],
    });
}

export function DealProposalForm({
  currentBlock,
  currentBlockTimestamp,
  accounts,
  onSubmit,
}: {
  currentBlock: number;
  currentBlockTimestamp: Date;
  accounts: InjectedAccountWithMeta[];
  onSubmit: (data: IFormValues) => Promise<void>;
}) {
  const schema = useMemo(() => {
    return validationSchema(currentBlock);
  }, [currentBlock]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<IFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      startBlock: currentBlock + OFFSET + maxProveCommitDuration,
      endBlock: currentBlock + OFFSET + minDealDuration + maxProveCommitDuration,
      pricePerBlock: 1000,
      providerCollateral: 100,
      providers: [],
    },
  });

  const [startBlock, endBlock, pricePerBlock] = watch(["startBlock", "endBlock", "pricePerBlock"]);

  const duration = endBlock - startBlock;
  const startBlockRealTime = blockToTime(startBlock, currentBlock, currentBlockTimestamp);
  const endBlockRealTime = blockToTime(endBlock, currentBlock, currentBlockTimestamp);
  const totalPrice = duration * pricePerBlock;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex bg-white rounded-lg shadow p-6 mb-4">
        <div>
          <h2 className="text-xl font-bold mb-4">Deal Creation</h2>
          <div className="flex flex-col min-w-md max-w-md">
            <div className="grid grid-cols-1 gap-4 mb-4">
              <HookAccountSelector id="client" register={register} accounts={accounts} />
              <PieceUploader error={errors.piece?.message} name="piece" control={control} />

              <HookInput
                id="label"
                register={register}
                error={errors.label}
                tooltip="A human-readable label for this storage deal"
                placeholder="a photo of my kitty"
              >
                Label
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
                disabled={isSubmitting}
                className={`px-4 py-2 bg-blue-200 rounded-sm  ${isSubmitting ? "bg-grey-200 cursor-progress" : "hover:bg-blue-600"}`}
                value="Continue"
              />
            </div>
          </div>
        </div>
        <div className="bg-black mx-8 min-w-px max-w-px" />
        <div>
          <ProviderSelector name="providers" control={control} error={errors.providers?.message} />
        </div>
      </div>
      <Toaster position="bottom-left" reverseOrder={true} />
    </form>
  );
}
