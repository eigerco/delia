import { FileText, Upload } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { type FieldError, type UseControllerProps, useController } from "react-hook-form";
import { commpFromBytes, paddedPieceSize } from "wasm-commp";
import { generateCar as generateCarV2 } from "../../lib/car/v2";
import { DisabledInputInfo } from "./DisabledInputInfo";
import type { IFormValues, Piece } from "./types";

interface FileUploaderProps extends UseControllerProps<IFormValues> {
  error?: FieldError;
}

export function HookPieceUploader({ error, ...props }: FileUploaderProps) {
  const {
    field: { onChange, value },
  } = useController(props);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      return new Promise<void>((resolve, reject) => {
        const file = acceptedFiles[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onloadend = async (e) => {
          if (e.target?.result) {
            try {
              const content = new Uint8Array(e.target.result as ArrayBuffer);
              const v2Bytes = await generateCarV2(content);

              const pieceSize = paddedPieceSize(v2Bytes);
              const cid = commpFromBytes(v2Bytes);

              onChange({ cid, size: pieceSize, file: file });
              resolve();
            } catch (err) {
              reject(err);
            }
          }
        };

        reader.readAsArrayBuffer(file);
      });
    },
    [onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const v = value as unknown as Piece | null;

  return (
    <>
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

        {v ? (
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
      <DisabledInputInfo
        label="Piece CID"
        name={`${props.name}-cid`}
        value={v?.cid || ""}
        tooltip="Content Identifier - a unique hash that identifies your data. Commitment after the raw data was pre-processed and put into a CARv2 file. This value is automatically computed after uploading your file."
      />
      <DisabledInputInfo
        label="Piece Size"
        name={`${props.name}-size`}
        value={v?.size.toString() || ""}
        tooltip="Piece size in bytes. This value is automatically computed after uploading your file. It is the length of the CARv2 archive after necessary padding."
      />
    </>
  );
}
