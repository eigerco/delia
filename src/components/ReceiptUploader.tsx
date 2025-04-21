import { FileText, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

// Props returned by FileUploader.
// Includes the !ORIGINAL! file and the CAR metadata.
type FileUploaderProps = { onFileReady: (file: File, contents: string) => void };

export function ReceiptUploader({ onFileReady }: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      return new Promise<void>((resolve, reject) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setSelectedFile(file);

        const reader = new FileReader();
        reader.onerror = async () => reject();
        reader.onloadend = async (e) => {
          if (e.target?.result) {
            try {
              // Type shenanigans
              onFileReady(file, e.target.result as string);
              resolve();
            } catch (err) {
              reject(err);
            }
          }
        };
        reader.readAsText(file);
      });
    },
    [onFileReady],
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
                ? "Drop the deal receipt here..."
                : "Drag and drop your deal receipt here, or click to select"}
            </p>
          </>
        )}
      </div>
    </>
  );
}
