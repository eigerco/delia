import type { ChangeEventHandler, PropsWithChildren } from "react";
import type { InputFields } from "../lib/dealProposal";
import { FileUploader } from "./FileUploader";

type FieldProps = {
  id: string;
  value: string;
  type?: string;
  disabled?: boolean;
  onChange?: ChangeEventHandler;
};

function Field({
  id,
  value,
  type = "text",
  disabled = false,
  onChange = (_) => {},
  children,
}: PropsWithChildren<FieldProps>) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {children}
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
      <Field id="client-address" disabled={true} value={dealProposal.client.toString()}>
        Client Address
      </Field>

      {/* TODO: add CID validation */}
      <Field id="piece-cid" value={dealProposal.pieceCid.toString()}>
        Piece CID
      </Field>

      <Field
        id="piece-size"
        type="number"
        value={dealProposal.pieceSize}
        onChange={(e) => {
          // TODO: check this "error"
          onChange({ ...dealProposal, pieceSize: e.target.value });
        }}
      >
        Piece Size
      </Field>

      <Field
        id="label"
        value={dealProposal.label}
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
        onChange={(e) => onChange({ ...dealProposal, startBlock: e.target.value })}
      >
        Start Block
      </Field>

      <Field
        id="end-block"
        type="number"
        value={dealProposal.endBlock}
        onChange={(e) => onChange({ ...dealProposal, endBlock: e.target.value })}
      >
        End Block
      </Field>

      <Field
        id="price-per-block"
        type="number"
        value={dealProposal.storagePricePerBlock}
        onChange={(e) => onChange({ ...dealProposal, storagePricePerBlock: e.target.value })}
      >
        {/* TODO: add hover/tooltip */}
        Price-per-Block
      </Field>

      <Field
        id="provider-collateral"
        type="number"
        value={dealProposal.providerCollateral}
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
  return (
    <div className="flex flex-col min-w-md max-w-md">
      <FormInput dealProposal={dealProposal} onChange={onChange} />
      <FileUploader onFileSelect={onFileSelect} selectedFile={selectedFile} />
    </div>
  );
}
