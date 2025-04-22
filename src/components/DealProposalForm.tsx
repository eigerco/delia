import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { HelpCircle } from "lucide-react";
import type { ChangeEventHandler, PropsWithChildren } from "react";
import { useCallback, useEffect, useState } from "react";
import { Tooltip } from "react-tooltip";
import { useCtx } from "../GlobalCtx";
import { BLOCK_TIME } from "../lib/consts";
import { plank_to_dot } from "../lib/conversion";
import type { InputFields } from "../lib/dealProposal";
import { FileUploader } from "./FileUploader";
import { MarketBalance, MarketBalanceStatus } from "./MarketBalance";

type FieldProps = {
  id: string;
  value: string;
  type?: string;
  disabled?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  tooltip?: string;
};

function Field({
  id,
  value,
  type = "text",
  disabled = false,
  onChange = (_) => {},
  tooltip,
  children,
}: PropsWithChildren<FieldProps>) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
      >
        {children}
        {tooltip && (
          <>
            <span id={`tooltip-${id}`} className="cursor-help inline-flex items-center ml-1">
              <HelpCircle className="inline w-4 h-4 text-gray-400" />
            </span>
            <Tooltip anchorSelect={`#tooltip-${id}`} content={tooltip} />
          </>
        )}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        onChange={onChange}
        className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${
          disabled ? "bg-gray-100 cursor-not-allowed" : ""
        }`}
      />
    </div>
  );
}

function blockToTime(block: number, currentBlock: number, currentBlockTimestamp: Date): Date {
  const timeDifference = (block - currentBlock) * BLOCK_TIME;
  const realTime = new Date(currentBlockTimestamp.getTime() + timeDifference);

  return realTime;
}

type FormInputProps = {
  dealProposal: InputFields;
  onChange: (dealProposal: InputFields) => void;
  accounts: InjectedAccountWithMeta[];
  selectedAccount: InjectedAccountWithMeta | null;
  onSelectAccount: (account: InjectedAccountWithMeta) => void;
  currentBlock: number;
  currentBlockTimestamp: Date;
  onFileSelect: (file: File) => void;
  onRequestBalanceRefresh?: (refresh: () => Promise<void>) => void;
};

const FormInput = ({
  dealProposal,
  onChange,
  accounts,
  selectedAccount,
  onSelectAccount,
  currentBlock,
  currentBlockTimestamp,
  onFileSelect,
  onRequestBalanceRefresh,
}: FormInputProps) => {
  const startBlock = Number.parseInt(dealProposal.startBlock);
  const endBlock = Number.parseInt(dealProposal.endBlock);

  const startBlockRealTime = blockToTime(startBlock, currentBlock, currentBlockTimestamp);
  const endBlockRealTime = blockToTime(endBlock, currentBlock, currentBlockTimestamp);

  const [marketBalance, setMarketBalance] = useState<string>("");
  const [balanceStatus, setBalanceStatus] = useState<MarketBalanceStatus>(MarketBalanceStatus.Idle);
  const { collatorWsApi: api } = useCtx();

  /**
   * Fetches the market balance for a given account and updates the component state.
   *
   * We wrap this in `useCallback` to ensure:
   * - The function identity is stable across renders
   * - We can safely include it in the `useEffect` dependency array
   *   (so it doesn't trigger the effect unnecessarily or cause linter warnings)
   *
   * This makes it safe to use in child callbacks or memoized effects.
   */
  const fetchMarketBalance = useCallback(
    async (account: InjectedAccountWithMeta): Promise<void> => {
      if (!api) return;

      setBalanceStatus(MarketBalanceStatus.Loading);
      try {
        const result = await api.query.market.balanceTable(account.address);
        const json = result.toJSON() as Record<string, unknown>;
        const free = (json.free as string) ?? "0";
        setMarketBalance(free);
        setBalanceStatus(MarketBalanceStatus.Fetched);
      } catch (err) {
        console.error("Error fetching market balance:", err);
        setMarketBalance("");
        setBalanceStatus(MarketBalanceStatus.Error);
      }
    },
    [api],
  );

  useEffect(() => {
    /**
     * We register a callback with the parent component (via onRequestBalanceRefresh)
     * so it can trigger a market balance refresh after deal submission.
     *
     * This must be done inside useEffect because:
     * - React does not allow calling setState (via props) during render
     * - Registering the callback after render avoids "setState in render" warnings
     *
     * Dependencies:
     * - selectedAccount: so we bind the refresh to the currently selected account
     * - onRequestBalanceRefresh: this function is passed from the parent
     * - fetchMarketBalance: memoized with useCallback
     */
    if (onRequestBalanceRefresh && selectedAccount) {
      // Defer the callback registration to the next tick
      onRequestBalanceRefresh(() => fetchMarketBalance(selectedAccount));
    }
  }, [onRequestBalanceRefresh, selectedAccount, fetchMarketBalance]);

  return (
    <div className="grid grid-cols-1 gap-4 mb-4">
      <div>
        <label
          htmlFor="account-selector"
          className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
        >
          Client Account
          <span id="tooltip-account-selector" className="cursor-help inline-flex items-center ml-1">
            <HelpCircle className="inline w-4 h-4 text-gray-400" />
          </span>
          <Tooltip
            anchorSelect="#tooltip-account-selector"
            content="Your blockchain account that will be associated with this storage deal"
          />
        </label>
        <select
          id="account-selector"
          value={selectedAccount?.address || ""}
          onChange={async (e) => {
            const account = accounts.find((acc) => acc.address === e.target.value);
            if (account) {
              onSelectAccount(account);
              onChange({ ...dealProposal, client: account.address });

              await fetchMarketBalance(account);
            }
          }}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select an account</option>
          {accounts.map((account) => (
            <option key={account.address} value={account.address}>
              {account.meta.name} ({account.address.slice(0, 8)}...{account.address.slice(-8)})
            </option>
          ))}
        </select>

        <MarketBalance value={marketBalance} status={balanceStatus} />
      </div>

      <FileUploader
        onMetadataReady={({ payloadCid, pieceSize, pieceCid: cid }, file) => {
          onChange({
            ...dealProposal,
            payloadCid: payloadCid,
            pieceSize: pieceSize.toString(),
            pieceCid: cid,
          });
          onFileSelect(file);
        }}
      />

      <Field
        id="payload-cid"
        value={dealProposal.payloadCid.toString()}
        disabled={true}
        tooltip="Content Identifier - root of the your file after being converted into the CAR format."
      >
        Payload CID
      </Field>

      <Field
        id="piece-cid"
        value={dealProposal.pieceCid.toString()}
        disabled={true}
        tooltip="Content Identifier - a unique hash that identifies your data. Commitment after the raw data was pre-processed and put into a CARv2 file. This value is automatically computed after uploading your file."
      >
        Piece CID
      </Field>

      <Field
        id="piece-size"
        value={dealProposal.pieceSize}
        disabled={true}
        tooltip="Piece size in bytes. This value is automatically computed after uploading your file. It is the length of the CARv2 archive after necessary padding."
        onChange={(e) => {
          onChange({ ...dealProposal, pieceSize: e.target.value });
        }}
      >
        Piece Size
      </Field>

      <Field
        id="label"
        value={dealProposal.label}
        tooltip="A human-readable label for this storage deal"
        onChange={(e) => {
          onChange({ ...dealProposal, label: e.target.value });
        }}
      >
        Label
      </Field>

      <i className="text-sm font-medium">Current block: {currentBlock}</i>
      <div className="flex flex-row items-center gap-4">
        <Field
          id="start-block"
          type="number"
          value={dealProposal.startBlock}
          tooltip="The block number of when the data is guaranteed to be available"
          onChange={(e) => onChange({ ...dealProposal, startBlock: e.target.value })}
        >
          Start Block
        </Field>
        <Field id="start-block-date" disabled value={startBlockRealTime.toLocaleString("en-GB")}>
          Estimated real-time
        </Field>
      </div>

      <div className="flex flex-row items-center gap-4">
        <Field
          id="end-block"
          type="number"
          value={dealProposal.endBlock}
          tooltip="The block number when the data ends to be available"
          onChange={(e) => onChange({ ...dealProposal, endBlock: e.target.value })}
        >
          End Block
        </Field>
        <Field id="end-block-date" disabled value={endBlockRealTime.toLocaleString("en-GB")}>
          Estimated real-time
        </Field>
      </div>

      <Field
        id="price-per-block"
        type="number"
        value={dealProposal.storagePricePerBlock}
        tooltip="The amount you'll pay for each block your data is stored"
        onChange={(e) => onChange({ ...dealProposal, storagePricePerBlock: e.target.value })}
      >
        Price-per-Block
      </Field>

      <Field
        id="provider-collateral"
        type="number"
        value={dealProposal.providerCollateral}
        tooltip="Amount the storage provider must stake as collateral to ensure they fulfill the deal"
        onChange={(e) => onChange({ ...dealProposal, providerCollateral: e.target.value })}
      >
        Provider Collateral
      </Field>
    </div>
  );
};

export function DealProposalForm({
  dealProposal,
  onChange,
  accounts,
  selectedAccount,
  onSelectAccount,
  currentBlock,
  currentBlockTimestamp,
  onFileSelect,
  onRequestBalanceRefresh,
}: {
  dealProposal: InputFields;
  currentBlock: number;
  currentBlockTimestamp: Date;
  onChange: (dealProposal: InputFields) => void;
  accounts: InjectedAccountWithMeta[];
  selectedAccount: InjectedAccountWithMeta | null;
  onSelectAccount: (account: InjectedAccountWithMeta) => void;
  onFileSelect: (file: File) => void;
  onRequestBalanceRefresh?: (refresh: () => Promise<void>) => void;
}) {
  // Calculate total price
  const startBlock = Number.parseInt(dealProposal.startBlock) || 0;
  const endBlock = Number.parseInt(dealProposal.endBlock) || 0;
  const pricePerBlock = Number.parseInt(dealProposal.storagePricePerBlock) || 0;
  const totalPrice = (endBlock - startBlock) * pricePerBlock;

  return (
    <div className="flex flex-col min-w-md max-w-md">
      <FormInput
        dealProposal={dealProposal}
        onChange={onChange}
        accounts={accounts}
        selectedAccount={selectedAccount}
        onSelectAccount={onSelectAccount}
        currentBlock={currentBlock}
        currentBlockTimestamp={currentBlockTimestamp}
        onFileSelect={onFileSelect}
        onRequestBalanceRefresh={onRequestBalanceRefresh}
      />

      {totalPrice > 0 && (
        <div className="p-3 mb-4 bg-blue-50 border border-blue-200 rounded">
          <p className="font-semibold text-sm">
            Total Deal Price: <span className="text-blue-600">{totalPrice}</span> Planck (
            <span className="text-blue-600">{plank_to_dot(totalPrice)}</span> DOT)
          </p>
          <p className="text-xs text-gray-500">
            ({endBlock - startBlock} blocks × {pricePerBlock} per block)
          </p>
        </div>
      )}
    </div>
  );
}
