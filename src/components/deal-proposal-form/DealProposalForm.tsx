import { zodResolver } from "@hookform/resolvers/zod";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useMemo } from "react";
import { useCallback, useEffect, useState } from "react";
import { type FieldError, useForm } from "react-hook-form";
import { z } from "zod";
import { useCtx } from "../../GlobalCtx";
import { blockToTime } from "../../lib/conversion";
import { type StorageProviderInfo, isStorageProviderInfo } from "../../lib/storageProvider";
import { Balance, BalanceStatus } from "../Balance";
import Collapsible from "../Collapsible";
import { HookAccountSelector } from "./AccountSelector";
import { DisabledInputInfo } from "./DisabledInputInfo";
import DurationInput, { type DurationValue } from "./DurationInput";
import { HookInput } from "./Input";
import { PieceUploader } from "./PieceUploader";
import { ProviderSelector } from "./ProviderSelector";
import type { FormValues } from "./types";

const BLOCKS_IN_MINUTE = 10;
const OFFSET = BLOCKS_IN_MINUTE * 5;
const DEFAULT_MAX_PROVE_COMMIT_DURATION = 50;

// TODO(@th7nder,16/04/2025): fetch from chain
// This is the minimum amount of blocks it'll take for the deal to be active.
const maxProveCommitDuration = DEFAULT_MAX_PROVE_COMMIT_DURATION;

const storageProviderInfoSchema = z.custom<StorageProviderInfo>(isStorageProviderInfo);

function validationSchema() {
  return z.object({
    duration: z
      .object({
        months: z.coerce.number().int("The number of months must be a whole number").min(0).max(12),
        days: z.coerce.number().int("The number of days must be a whole number").min(0).max(30),
      })
      .refine(({ months, days }) => !(months === 0 && days === 0), "Deal duration cannot be 0")
      .refine(
        ({ months, days }) => months * 30 + days < 365,
        "The total deal duration cannot be bigger than one year (365 days).",
      ),
    piece: z.object({
      pieceCid: z.string(),
      payloadCid: z.string(),
      size: z.number(),
      file: z.instanceof(File).refine((file: File) => file.size <= 8 * 1024 * 1024, {
        message: "File must be under 8MB",
      }),
    }),
    label: z.string().max(128),
    client: z.string(),
    providers: z
      .array(storageProviderInfoSchema)
      .min(1, "There must be at least 1 Storage Provider selected"),
  });
}

export function calculateStartEndBlocks(currentBlock: number, duration: DurationValue) {
  const startBlock = currentBlock + OFFSET + maxProveCommitDuration;
  const endBlock =
    startBlock +
    duration.days * 24 * 60 * BLOCKS_IN_MINUTE +
    duration.months * 30 * 24 * 60 * BLOCKS_IN_MINUTE;

  const durationInBlocks = endBlock - startBlock;

  return {
    startBlock,
    endBlock,
    durationInBlocks,
  };
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
  onSubmit: (data: FormValues) => Promise<void>;
}) {
  const schema = useMemo(() => {
    return validationSchema();
  }, []);
  const defaultClient = accounts[0]?.address ?? "";

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      client: defaultClient,
      providers: [],
      duration: {
        days: 1,
        months: 0,
      },
    },
    mode: "onChange",
  });

  const [duration, providers] = watch(["duration", "providers"]);
  const { startBlock, endBlock, durationInBlocks } = calculateStartEndBlocks(
    currentBlock,
    duration,
  );

  const startBlockRealTime = blockToTime(startBlock, currentBlock, currentBlockTimestamp);
  const endBlockRealTime = blockToTime(endBlock, currentBlock, currentBlockTimestamp);
  const totalPrice = providers
    .map((p) => p.dealParams.minimumPricePerBlock * durationInBlocks)
    .reduce((a, b) => a + b, 0);

  const { collatorWsApi: api, tokenProperties } = useCtx();
  const client = watch("client");
  const [balanceStatus, setBalanceStatus] = useState<BalanceStatus>(BalanceStatus.idle);

  const fetchBalance = useCallback(async () => {
    if (!api || !client) return;

    setBalanceStatus(BalanceStatus.loading);
    try {
      const result = await api.query.market.balanceTable(client);
      const record = result.toJSON() as Record<string, number>;
      setBalanceStatus(BalanceStatus.fetched(BigInt(record.free)));
    } catch (err) {
      console.error("Error fetching market balance:", err);
      setBalanceStatus(BalanceStatus.error("Failed to fetch market balance"));
    }
  }, [api, client]);

  useEffect(() => {
    if (client) {
      fetchBalance();
    }
  }, [client, fetchBalance]);

  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        await onSubmit(data);
        fetchBalance();
      })}
    >
      <div className="flex flex-col bg-white rounded-lg shadow p-6 mb-4">
        <div>
          <h2 className="text-xl font-bold mb-4">Deal Creation</h2>
          <div className="flex flex-col">
            <div className="grid grid-cols-1 gap-4 mb-4">
              <HookAccountSelector id="client" register={register} accounts={accounts} />
              <Balance status={balanceStatus} balanceType="Market" />
              <PieceUploader
                error={errors.piece?.message || errors.piece?.file?.message}
                name="piece"
                control={control}
              />

              <HookInput
                id="label"
                register={register}
                error={errors.label}
                tooltip="A human-readable label for this storage deal"
                placeholder="A photo of my kitty"
              >
                Label
              </HookInput>

              <div>
                <DurationInput
                  name="duration"
                  label="Duration"
                  required={true}
                  control={control}
                  maxMonths={24} // Limit to 2 years
                  error={
                    errors.duration?.months ||
                    errors.duration?.days ||
                    // In this case, duration does not have .months or .days fields
                    // it instead has a .message and its friends
                    // we could make this check more comprehensive but this is Good Enough (TM)
                    (errors.duration as FieldError)
                  }
                />

                <Collapsible title="Details">
                  <div className="flex flex-col gap-4">
                    <i className="text-sm font-medium">Current block: {currentBlock}</i>
                    <div className="flex flex-row items-start gap-4">
                      <div className="w-1/2">
                        <DisabledInputInfo
                          name="startBlock"
                          value={startBlock.toString()}
                          label="Start Block"
                        />
                      </div>

                      <DisabledInputInfo
                        name="startBlockTime"
                        value={startBlockRealTime.toLocaleString("en-GB")}
                        label="Estimated real-time"
                      />
                    </div>

                    <div className="flex flex-row items-start gap-4">
                      <div className="w-1/2">
                        <DisabledInputInfo
                          name="endBlock"
                          value={endBlock.toString()}
                          label="End Block"
                        />
                      </div>
                      <DisabledInputInfo
                        name="endBlockTime"
                        value={endBlockRealTime.toLocaleString("en-GB")}
                        label="Estimated real-time"
                      />
                    </div>
                  </div>
                </Collapsible>
              </div>
            </div>
          </div>
        </div>

        <div>
          <ProviderSelector name="providers" control={control} error={errors.providers?.message} />
        </div>

        {totalPrice > 0 && (
          <div className="p-3 mb-4 bg-blue-50 border border-blue-200 rounded">
            <ul className="list-disc pb-2">
              {providers.map((p) => (
                <li key={p.accountId} className="ml-2 text-xs text-gray-500">
                  Provider: <i>{p.accountId.slice(0, 32)}...</i>
                  <br />
                  {durationInBlocks * p.dealParams.minimumPricePerBlock} {" Planck"} ={" "}
                  {durationInBlocks} blocks × {p.dealParams.minimumPricePerBlock} Planck/block
                </li>
              ))}
            </ul>

            <p className="font-semibold text-sm">
              Total Deal Price: <span className="text-blue-600">{totalPrice}</span> Planck (
              <span className="text-blue-600">
                {tokenProperties.formatUnit(tokenProperties.planckToUnit(totalPrice), true)}
              </span>
              )
            </p>
          </div>
        )}

        <input
          type="submit"
          disabled={isSubmitting}
          className={`px-4 py-2 bg-blue-200 rounded-sm  ${isSubmitting ? "bg-grey-200 cursor-progress" : "hover:bg-blue-600 hover:text-white"}`}
          value="Continue"
        />
      </div>
    </form>
  );
}
