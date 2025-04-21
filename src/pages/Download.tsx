import type { Multiaddr } from "@multiformats/multiaddr";
import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { Tooltip } from "react-tooltip";
import { useCtx } from "../GlobalCtx";
import { ReceiptUploader } from "../components/ReceiptUploader";
import { DownloadButton } from "../components/buttons/DownloadButton";
import { createDownloadTrigger } from "../lib/download";
import { resolvePeerIdMultiaddrs } from "../lib/resolvePeerIdMultiaddr";
import { retrieveContent } from "../lib/retrieval";
import { SubmissionReceipt } from "../lib/submissionReceipt";

export function Download() {
  const { collatorWsApi, collatorWsProvider } = useCtx();
  const [submissionResultFile, setSubmissionResultFile] = useState<File | null>(null);
  const [submissionReceipt, setSubmissionResult] = useState<SubmissionReceipt | null>(null);
  const [submissionFailureFilename, setSubmissionFailureFilename] = useState<string | null>(null);

  const [shouldExtract, setShouldExtract] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const download = async () => {
    if (!collatorWsProvider || !collatorWsApi) {
      toast.error("Failed to connect to collator!");
      return;
    }
    if (!submissionResultFile) {
      toast.error("No submission result was uploaded!");
      return;
    }
    if (!submissionReceipt) {
      setSubmissionFailureFilename(submissionResultFile.name);
      return;
    }

    setIsDownloading(true);
    try {
      await toast.promise(
        async () => {
          // This has a bunch of improvements that can be applied,
          // namely, we can make this whole resolution deal batched on the server side
          const multiaddrs = await Promise.all(
            submissionReceipt.deals.map((deal) =>
              resolvePeerIdMultiaddrs(
                {
                  wsProvider: collatorWsProvider,
                  apiPromise: collatorWsApi,
                },
                deal.storageProviderPeerId,
              ),
            ),
          );
          const providers = (Array.prototype.concat(...multiaddrs) as Multiaddr[]).filter((maddr) =>
            maddr.protoNames().includes("ws"),
          );
          if (providers.length === 0) {
            throw new Error("Could not find storage providers for your request!");
          }

          const { title, contents } = await retrieveContent(
            submissionReceipt.payloadCid,
            providers,
            shouldExtract,
          );
          createDownloadTrigger(title, contents);
        },
        { loading: "Downloading file!" },
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4 bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-bold">Deal Retrieval</h2>
        <ReceiptUploader
          onFileReady={(file, content) => {
            // We can't validate the file onDrop because dropzone sucks
            // * It doesn't allow the validation function to be async
            // * It doesn't allow a mapping function to be applied and in turn pass the parsed file forwards
            setSubmissionResultFile(file);
            try {
              setSubmissionResult(SubmissionReceipt.parse(content));
            } catch (e) {
              if (e instanceof Error) {
                setSubmissionFailureFilename(e.message);
              } else {
                setSubmissionFailureFilename(`Failed to parse file ${file.name}`);
              }
            }
          }}
        />
        {submissionFailureFilename ? (
          <p className="text-red-400">{submissionFailureFilename}</p>
        ) : (
          <></>
        )}

        <Extract extract={shouldExtract} setExtract={setShouldExtract} />

        <DownloadButton
          onClick={download}
          disabled={isDownloading}
          text={isDownloading ? "Downloading..." : "Download"}
        />
      </div>
      <Toaster position="top-center" reverseOrder={true} />
    </>
  );
}

type ExtractProps = { extract: boolean; setExtract: (extract: boolean) => void };
function Extract({ extract, setExtract }: ExtractProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        id="extract-car"
        type="checkbox"
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        checked={extract}
        onChange={(e) => setExtract(e.target.checked)}
      />
      <label htmlFor="extract-car" className="flex gap-1 text-sm text-gray-700 items-center">
        Extract
        <span id="extract-tooltip" className="cursor-help">
          <HelpCircle className="w-4 h-4 text-gray-400" />
        </span>
        <Tooltip
          anchorSelect="#extract-tooltip"
          content="When checked, extracts the content. When unchecked, downloads the raw CAR file."
        />
      </label>
    </div>
  );
}
