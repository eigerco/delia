import { FileText, Upload } from "lucide-react";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

export function FileUploader({
  onFileSelect,
  selectedFile,
}: {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
  });

  return (
    <div
      {...getRootProps()}
      className={`flex flex-col items-center p-6 border-2 border-dashed rounded-lg transition-colors cursor-pointer hover:border-blue-400 ${
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
          <FileText className="w-12 h-12 text-green-500 mb-2" />
          <p className="text-sm font-medium text-green-600">File processed successfully!</p>
          <p className="text-sm text-green-600 font-mono mt-1">
            {selectedFile.name} with {selectedFile.size} bytes
          </p>
          <p className="text-xs text-green-600 mt-2">Drop another file to replace</p>
        </>
      ) : (
        <>
          <Upload className="w-12 h-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            {isDragActive
              ? "Drop the file here..."
              : "Drag and drop a file here, or click to select"}
          </p>
        </>
      )}
    </div>
  );
}
