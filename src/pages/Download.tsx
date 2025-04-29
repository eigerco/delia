import type { Multiaddr } from "@multiformats/multiaddr";
import { HelpCircle } from "lucide-react";
import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { Tooltip } from "react-tooltip";
import { ZodError } from "zod";
import { useCtx } from "../GlobalCtx";
import { ReceiptUploader } from "../components/ReceiptUploader";
import { DownloadButton } from "../components/buttons/DownloadButton";
import { createDownloadTrigger } from "../lib/download";
import { resolvePeerIdMultiaddrs } from "../lib/resolvePeerIdMultiaddr";
import { retrieveContent } from "../lib/retrieval";
import { SubmissionReceipt } from "../lib/submissionReceipt";

type InputReceipt =
  | {
      status: "ok";
      file: File;
      receipt: SubmissionReceipt;
    }
  | {
      status: "error";
      message: string;
    };

namespace InputReceipt {
  export function Ok(file: File, receipt: SubmissionReceipt): InputReceipt {
    return { status: "ok", file, receipt };
  }
  export function Err(message: string): InputReceipt {
    return { status: "error", message };
  }
}

export function Download() {
  const { collatorWsApi, collatorWsProvider } = useCtx();
  const [inputReceipt, setInputReceipt] = useState<InputReceipt | null>(null);
  const [shouldExtract, setShouldExtract] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadInner = async () => {
    if (!collatorWsProvider || !collatorWsApi) {
      throw new Error("Failed to connect to collator!");
    }
    if (!inputReceipt) {
      throw new Error("No receipt has been uploaded");
    }
    if (inputReceipt.status === "error") {
      // No need to throw since we already are showing the error
      return;
    }

    // This has a bunch of improvements that can be applied,
    // namely, we can make this whole resolution deal batched on the server side
    const multiaddrs = await Promise.all(
      // submissionReceipt.deals
      inputReceipt.receipt.deals.map((deal) =>
        resolvePeerIdMultiaddrs(
          {
            wsProvider: collatorWsProvider,
            apiPromise: collatorWsApi,
          },
          deal.storageProviderPeerId,
        ),
      ),
    );
    const providers = (Array.prototype.concat(...multiaddrs) as Multiaddr[]).filter(
      (maddr) => maddr.protoNames().includes("wss") || maddr.protoNames().includes("ws"),
    );
    if (providers.length === 0) {
      throw new Error("Could not find storage providers for your request!");
    }

    const contents = await retrieveContent(
      inputReceipt.receipt.payloadCid,
      providers,
      shouldExtract,
    );
    createDownloadTrigger(inputReceipt.receipt.filename, contents);
    // const contents = await retrieveContent(submissionReceipt.payloadCid, providers, shouldExtract);
    // createDownloadTrigger(submissionReceipt.filename, contents);
  };

  const download = async () => {
    setIsDownloading(true);
    try {
      await toast.promise(downloadInner(), { loading: "Downloading file!" });
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
            // Always clear the receipt just in case
            setInputReceipt(null);
            // We can't validate the file onDrop because dropzone sucks
            // * It doesn't allow the validation function to be async
            // * It doesn't allow a mapping function to be applied and in turn pass the parsed file forwards
            try {
              setInputReceipt(InputReceipt.Ok(file, SubmissionReceipt.new(JSON.parse(content))));
            } catch (e) {
              if (e instanceof SyntaxError) {
                setInputReceipt(InputReceipt.Err("File is not valid JSON!"));
              } else if (e instanceof ZodError) {
                setInputReceipt(InputReceipt.Err(e.errors.map((err) => err.message).join("\n")));
              } else if (e instanceof Error) {
                setInputReceipt(InputReceipt.Err(e.message));
              } else {
                setInputReceipt(InputReceipt.Err(`Failed to parse file ${file.name}`));
              }
            }
          }}
        />
        {inputReceipt?.status === "error" ? (
          <pre className="text-red-400 text-xs">{inputReceipt.message}</pre>
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
