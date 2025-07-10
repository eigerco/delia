import { zodResolver } from "@hookform/resolvers/zod";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { HelpCircle } from "lucide-react";
import { useMemo } from "react";
import { useCallback, useEffect, useState } from "react";
import { type FieldError, useForm } from "react-hook-form";
import { Tooltip } from "react-tooltip";
import { z } from "zod";
import { useCtx } from "../../GlobalCtx";
import { OFFSET, daysToBlocks, monthsToBlocks } from "../../lib/consts";
import { blockToTime } from "../../lib/conversion";
import { type StorageProviderInfo, isStorageProviderInfo } from "../../lib/storageProvider";
import { Balance, BalanceStatus } from "../Balance";
import Collapsible from "../Collapsible";
import { Button } from "../buttons/Button";
import { FaucetButton } from "../buttons/FaucetButton";
import { HookAccountSelector } from "./AccountSelector";
import { DisabledInputInfo } from "./DisabledInputInfo";
import DurationInput, { type DurationValue } from "./DurationInput";
import { HookInput } from "./Input";
import { PieceUploader } from "./PieceUploader";
import { ProviderSelector } from "./ProviderSelector";
import type { FormValues } from "./types";

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

export function calculateStartEndBlocks(
  currentBlock: number,
  duration: DurationValue,
  maxProveCommitDuration: number,
) {
  const startBlock = currentBlock + OFFSET + maxProveCommitDuration;
  const endBlock = startBlock + daysToBlocks(duration.days) + monthsToBlocks(duration.months);

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
  maxProveCommitDuration,
  accounts,
  onSubmit,
}: {
  currentBlock: number;
  currentBlockTimestamp: Date;
  maxProveCommitDuration: number;
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

  const formValues = watch();
  const { duration, providers, piece } = formValues;

  const { papiTypedApi: api } = useCtx();

  const startBlock = currentBlock + OFFSET + maxProveCommitDuration;
  const endBlock = startBlock + daysToBlocks(duration.days) + monthsToBlocks(duration.months);
  const durationInBlocks = endBlock - startBlock;

  const startBlockRealTime = blockToTime(startBlock, currentBlock, currentBlockTimestamp);
  const endBlockRealTime = blockToTime(endBlock, currentBlock, currentBlockTimestamp);
  const totalPrice = providers
    .map((p) => Number(p.dealParams.minimumPricePerBlock) * durationInBlocks)
    .reduce((a, b) => a + b, 0);

  const client = formValues.client;
  const [balanceStatus, setBalanceStatus] = useState<BalanceStatus>(BalanceStatus.idle);

  // Check if form is valid for submission
  const isFormComplete =
    // Check if piece is uploaded
    piece?.pieceCid &&
    piece?.payloadCid &&
    piece?.file &&
    // Check if client is selected
    client &&
    // Check if providers are selected
    providers.length > 0 &&
    // Check if duration is valid
    (duration?.months > 0 || duration?.days > 0) &&
    // Check if there are no errors
    Object.keys(errors).length === 0;

  const fetchBalance = useCallback(async () => {
    if (!api || !client) return;

    setBalanceStatus(BalanceStatus.loading);
    try {
      const accountInfo = await api.query.System.Account.getValue(client);
      const freeBalance: bigint = accountInfo?.data.free;
      setBalanceStatus(BalanceStatus.fetched(freeBalance));
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
    <form onSubmit={(e) => e.preventDefault()}>
      <div className="flex flex-col bg-white rounded-lg shadow p-6 mb-4">
        <div>
          <h2 className="text-xl font-bold mb-4">Deal Creation</h2>
          <div className="flex flex-col">
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div className="flex-col">
                <label
                  htmlFor="client"
                  className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
                >
                  Client Account
                  <span
                    id="tooltip-account-selector"
                    className="cursor-help inline-flex items-center ml-1"
                  >
                    <HelpCircle className="inline w-4 h-4 text-gray-400" />
                  </span>
                  <Tooltip
                    anchorSelect="#tooltip-account-selector"
                    content="The blockchain account that will be associated with (and pay for) this storage deal"
                  />
                </label>
                <div className="flex gap-4 justify-between items-center">
                  <div className="flex gap-4">
                    <HookAccountSelector id="client" register={register} accounts={accounts} />
                    <Balance status={balanceStatus} />
                  </div>
                  <FaucetButton
                    selectedAddress={client}
                    onSuccess={() => {
                      const selected = accounts.find((a) => a.address === client);
                      if (selected) {
                        void fetchBalance();
                      }
                    }}
                  />
                </div>
              </div>

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
          <ProviderSelector
            name="providers"
            control={control}
            error={errors.providers?.message}
            totalPrice={totalPrice}
          />
        </div>

        <Button
          onClick={handleSubmit(async (data) => {
            await onSubmit(data);
            fetchBalance();
          })}
          disabled={isSubmitting || !isFormComplete}
          loading={isSubmitting}
          className="w-full"
          variant="primary"
          tooltip={
            isSubmitting
              ? "Submitting deal proposal..."
              : !isFormComplete
                ? "Enter the deal information first"
                : ""
          }
        >
          Continue
        </Button>
      </div>
    </form>
  );
}
