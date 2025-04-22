import { FileText, Loader2, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { type UseControllerProps, useController } from "react-hook-form";
import { commpFromBytes, paddedPieceSize } from "wasm-commp";
import { generateCar as generateCarV2 } from "../../lib/car/v2";
import Collapsible from "../Collapsible";
import { DisabledInputInfo } from "./DisabledInputInfo";
import type { FormValues, Piece } from "./types";

interface FileUploaderProps extends UseControllerProps<FormValues> {
  error?: string;
}

export function PieceUploader({ error, ...props }: FileUploaderProps) {
  const {
    field: { onChange, value },
  } = useController(props);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      return new Promise<void>((resolve, reject) => {
        const file = acceptedFiles.at(0);
        if (!file) {
          reject("No files were passed in.");
          return;
        }

        const reader = new FileReader();
        setIsProcessing(true);

        reader.onloadend = async (e) => {
          if (!e.target?.result) {
            reject("Failed to load file contents");
            return;
          }

          try {
            const content = new Uint8Array(e.target.result as ArrayBuffer);
            const [rootCid, v2Bytes] = await generateCarV2(content);

            const pieceSize = Number.parseInt(paddedPieceSize(v2Bytes));
            const cid = commpFromBytes(v2Bytes);

            onChange({
              pieceCid: cid,
              payloadCid: rootCid.toString(),
              size: pieceSize,
              file: file,
            });
            resolve();
          } catch (err) {
            reject(err);
          } finally {
            setIsProcessing(false);
          }
        };

        reader.readAsArrayBuffer(file);
      });
    },
    [onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isProcessing,
  });

  // as unknown, because TypeScript compiler complains.
  // as Piece | null, because I can't figure out how to enforce that FormValues[name] passed here will be `Piece` typed at typescript level.
  const v = value as unknown as Piece | null;

  return (
    <div>
      <div
        {...getRootProps()}
        className={`flex items-center p-4 border-2 border-dashed rounded-lg transition-colors cursor-pointer hover:border-blue-400 ${
          isDragActive
            ? "border-blue-400 bg-blue-50"
            : value
              ? "border-green-500 bg-green-50"
              : "border-gray-300"
        } ${error ? "bg-red-100 border-red-500 focus:ring-red-500" : "border-gray-300"}`}
      >
        <input {...getInputProps()} />

        {isProcessing ? (
          <Loader2 className="animate-spin mx-auto h-8 w-8 text-blue-500" />
        ) : v ? (
          <>
            <FileText className="w-12 h-12 text-green-500 mr-2" />
            <div className="flex flex-col">
              <p className="text-sm text-green-600 font-mono">
                {v.file.name} ({v.file.size} bytes)
              </p>
              <p className="text-xs text-green-600">Drop another file to replace</p>
            </div>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-400 mr-2" />
            <p className="text-sm text-gray-600">
              {isDragActive
                ? "Drop the file here..."
                : "Drag and drop a file here, or click to select"}
            </p>
          </>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error || "This field is invalid"}</p>}

      {v?.payloadCid && (
        <Collapsible title={"Processed file metadata"}>
          <div className="flex flex-col gap-4">
            <DisabledInputInfo
              label="Payload CID"
              name={`${props.name}-payload-cid`}
              value={v?.payloadCid || ""}
              tooltip="Content Identifier - root of the your file after being converted into the CAR format."
            />
            <DisabledInputInfo
              label="Piece CID"
              name={`${props.name}-cid`}
              value={v?.pieceCid || ""}
              tooltip="Content Identifier - a unique hash that identifies your data. Commitment after the raw data was pre-processed and put into a CARv2 file. This value is automatically computed after uploading your file."
            />
            <DisabledInputInfo
              label="Piece Size"
              name={`${props.name}-size`}
              value={v?.size.toString() || ""}
              tooltip="Piece size in bytes. This value is automatically computed after uploading your file. It is the length of the CARv2 archive after necessary padding."
            />
          </div>
        </Collapsible>
      )}
    </div>
  );
}
