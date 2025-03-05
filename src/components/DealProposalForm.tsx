import { FileUploader } from "./FileUploader";
import type { Input as DealInput } from "../lib/dealProposal";
import type { ChangeEventHandler, PropsWithChildren } from "react";

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
    <>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {children}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        onChange={onChange}
        className={`w-full p-2 border rounded  focus:ring-blue-500 focus:border-blue-500 ${disabled ? "bg-gray-100" : ""}`}
      />
    </>
  );
}

const FormInput = ({
  dealProposal,
  onChange,
}: {
  dealProposal: DealInput;
  onChange: (dealProposal: DealInput) => void;
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
          onChange(dealProposal.copyUpdate("pieceSize", e.target.value));
        }}
      >
        Piece Size
      </Field>

      <Field
        id="label"
        value={dealProposal.label}
        onChange={(e) => {
          onChange(dealProposal.copyUpdate("label", e.target.value));
        }}
      >
        Label
      </Field>

      <Field
        id="start-block"
        type="number"
        value={dealProposal.startBlock}
        onChange={(e) =>
          onChange(dealProposal.copyUpdate("startBlock", e.target.value))
        }
      >
        Start Block
      </Field>

      <Field
        id="end-block"
        type="number"
        value={dealProposal.endBlock}
        onChange={(e) =>
          onChange(dealProposal.copyUpdate("endBlock", e.target.value))
        }
      >
        End Block
      </Field>

      <Field
        id="price-per-block"
        type="number"
        value={dealProposal.storagePricePerBlock}
        onChange={(e) =>
          onChange(
            dealProposal.copyUpdate("storagePricePerBlock", e.target.value)
          )
        }
      >
        {/* TODO: add hover/tooltip */}
        Price-per-Block
      </Field>

      <Field
        id="provider-collateral"
        type="number"
        value={dealProposal.providerCollateral}
        onChange={(e) =>
          onChange(
            dealProposal.copyUpdate("providerCollateral", e.target.value)
          )
        }
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
  dealProposal: DealInput;
  onChange: (dealProposal: DealInput) => void;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}) {
  return (
    <div className="flex flex-col grow">
      <FormInput dealProposal={dealProposal} onChange={onChange} />
      <FileUploader onFileSelect={onFileSelect} selectedFile={selectedFile} />
    </div>
  );
}
