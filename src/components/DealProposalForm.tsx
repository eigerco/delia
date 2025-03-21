import type { ChangeEventHandler, PropsWithChildren } from "react";
import type { InputFields } from "../lib/dealProposal";
import { FileUploader } from "./FileUploader";
import { Tooltip } from "react-tooltip";
import { HelpCircle } from "lucide-react";

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
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
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
        className={`w-full p-2 border rounded  focus:ring-blue-500 focus:border-blue-500 ${disabled ? "bg-gray-100 mouse cursor-not-allowed" : ""}`}
      />
    </div>
  );
}

const FormInput = ({
  dealProposal,
  onChange,
}: {
  dealProposal: InputFields;
  onChange: (dealProposal: InputFields) => void;
}) => {
  return (
    <div className="grid grid-cols-1 gap-4 mb-4">
      <Field
        id="client-address"
        disabled={true}
        value={dealProposal.client.toString()}
        tooltip="Your blockchain address that will be associated with this storage deal"
      >
        Client Address
      </Field>

      {/* TODO: add CID validation */}
      <Field
        id="piece-cid"
        value={dealProposal.pieceCid.toString()}
        tooltip="Content Identifier - a unique hash that identifies your data. Commitment after the raw data was pre-processed and put into a CARv2 file. It can by generated by `polka-storage-provider-client proofs commp <carv2>."
      >
        Piece CID
      </Field>

      <Field
        id="piece-size"
        type="number"
        value={dealProposal.pieceSize}
        tooltip="Piece size in bytes. It can by generated by `polka-storage-provider-client proofs commp <carv2>."
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

      <Field
        id="start-block"
        type="number"
        value={dealProposal.startBlock}
        tooltip="The block number of when the deal starts"
        onChange={(e) => onChange({ ...dealProposal, startBlock: e.target.value })}
      >
        Start Block
      </Field>

      <Field
        id="end-block"
        type="number"
        value={dealProposal.endBlock}
        tooltip="The block number when the deal will end"
        onChange={(e) => onChange({ ...dealProposal, endBlock: e.target.value })}
      >
        End Block
      </Field>

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
  onFileSelect,
  selectedFile,
}: {
  dealProposal: InputFields;
  onChange: (dealProposal: InputFields) => void;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}) {
  // Calculate total price
  const startBlock = parseInt(dealProposal.startBlock) || 0;
  const endBlock = parseInt(dealProposal.endBlock) || 0;
  const pricePerBlock = parseInt(dealProposal.storagePricePerBlock) || 0;
  const totalPrice = (endBlock - startBlock) * pricePerBlock;

  return (
    <div className="flex flex-col min-w-md max-w-md">
      <FormInput dealProposal={dealProposal} onChange={onChange} />

      {totalPrice > 0 && (
        <div className="p-3 mb-4 bg-blue-50 border border-blue-200 rounded">
          <p className="font-semibold text-sm">Total Deal Price: <span className="text-blue-600">{totalPrice}</span></p>
          <p className="text-xs text-gray-500">({endBlock - startBlock} blocks × {pricePerBlock} per block)</p>
        </div>
      )}

      <FileUploader onFileSelect={onFileSelect} selectedFile={selectedFile} />
    </div>
  );
}
