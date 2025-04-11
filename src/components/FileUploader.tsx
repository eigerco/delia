import { FileText, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { commp_from_bytes, padded_piece_size } from "../../wasm-commp/pkg/wasm_commp.js";
import { generateCar as generateCarV2 } from "../lib/car/v2";

// Props returned by FileUploader.
// Includes the !ORIGINAL! file and the CAR metadata.
type FileUploaderProps = {
  onMetadataReady: (meta: CarMetadata, file: File) => void;
};

// CAR metadata returned by the FileUploader
type CarMetadata = {
  pieceSize: number;
  // CommP
  cid: string;
};

export function FileUploader({ onMetadataReady }: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setSelectedFile(file);

      const reader = new FileReader();

      reader.onloadend = async (e) => {
        if (e.target?.result) {
          const content = new Uint8Array(e.target.result as ArrayBuffer);
          const v2Bytes = await generateCarV2(content);

          const piece_size = padded_piece_size(v2Bytes);
          const cid = commp_from_bytes(v2Bytes);

          onMetadataReady({ pieceSize: piece_size, cid }, file);
        }
      };

      reader.readAsArrayBuffer(file);
    },
    [onMetadataReady],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <>
      <div
        {...getRootProps()}
        className={`flex items-center p-4 border-2 border-dashed rounded-lg transition-colors cursor-pointer hover:border-blue-400 ${
          isDragActive
            ? "border-blue-400 bg-blue-50"
            : selectedFile
              ? "border-green-500 bg-green-50"
              : "border-gray-300"
        } `}
      >
        <input {...getInputProps()} />

        {selectedFile ? (
          <>
            <FileText className="w-12 h-12 text-green-500 mr-2" />
            <div className="flex flex-col">
              <p className="text-sm text-green-600 font-mono">
                {selectedFile.name} ({selectedFile.size} bytes)
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
    </>
  );
}
