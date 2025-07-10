import { multiaddr } from "@multiformats/multiaddr";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { ZodError } from "zod";
import { useCtx } from "../GlobalCtx";
import { ReceiptUploader } from "../components/ReceiptUploader";
import { Button } from "../components/buttons/Button";
import { DealStatus } from "../components/retrieval/DealStatus";
import { createDownloadTrigger } from "../lib/download";
import { SubmissionReceipt } from "../lib/submissionReceipt";

export type InputReceipt =
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
  export function ok(file: File, receipt: SubmissionReceipt): InputReceipt {
    return { status: "ok", file, receipt };
  }
  export function err(message: string): InputReceipt {
    return { status: "error", message };
  }
}

export function Retrieval() {
  const { papiTypedApi, collatorWsProvider } = useCtx();
  const [inputReceipt, setInputReceipt] = useState<InputReceipt | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [canDownload, setCanDownload] = useState(false);

  const downloadInner = async () => {
    if (!collatorWsProvider || !papiTypedApi) {
      throw new Error("Failed to connect to collator!");
    }
    if (!inputReceipt) {
      throw new Error("No receipt has been uploaded");
    }
    if (inputReceipt.status === "error") {
      // No need to throw since we already are showing the error
      return;
    }

    if (inputReceipt.receipt.deals.length === 0) {
      throw new Error("Could not find deals for your request!");
    }

    // This has a bunch of improvements that can be applied,
    // namely, we can make this whole resolution deal batched on the server side
    const providers = inputReceipt.receipt.deals.map((deal) =>
      multiaddr(deal.storageProviderMultiaddr),
    );

    const { address, port } = providers[0].nodeAddress();
    const url = `http://${address}:${port}/api/v0/download/${inputReceipt.receipt.pieceCid}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    createDownloadTrigger(inputReceipt.receipt.filename, await response.blob());
  };

  const download = async () => {
    setIsDownloading(true);
    try {
      await toast.promise(downloadInner(), {
        loading: "Downloading file!",
        success: () => <>Download successful!</>,
        error: (err) => `${err.message}`,
      });
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
              setInputReceipt(InputReceipt.ok(file, SubmissionReceipt.new(JSON.parse(content))));
            } catch (e) {
              if (e instanceof SyntaxError) {
                setInputReceipt(InputReceipt.err("File is not valid JSON!"));
              } else if (e instanceof ZodError) {
                setInputReceipt(InputReceipt.err(e.errors.map((err) => err.message).join("\n")));
              } else if (e instanceof Error) {
                setInputReceipt(InputReceipt.err(e.message));
              } else {
                setInputReceipt(InputReceipt.err(`Failed to parse file ${file.name}`));
              }
            }
          }}
        />
        {inputReceipt?.status === "error" ? (
          <pre className="text-red-400 text-xs">{inputReceipt.message}</pre>
        ) : (
          <></>
        )}

        {inputReceipt?.status === "ok" && (
          <DealStatus
            receipt={inputReceipt.receipt}
            onCanDownload={(canDownload) => setCanDownload(canDownload)}
          />
        )}

        <div className="flex flex-col gap-2">
          <Button
            onClick={download}
            disabled={
              isDownloading || !inputReceipt || inputReceipt.status === "error" || !canDownload
            }
            loading={isDownloading}
            className="w-full"
            tooltip={
              isDownloading
                ? "Download in progress"
                : !inputReceipt
                  ? "Upload a receipt file first"
                  : inputReceipt.status === "error"
                    ? "Fix receipt file errors"
                    : ""
            }
          >
            {isDownloading ? "Downloading..." : "Download"}
          </Button>
        </div>
      </div>
    </>
  );
}
