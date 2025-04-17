import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { bitswap } from "@helia/block-brokers";
import { car } from "@helia/car";
import { libp2pRouting } from "@helia/routers";
import { unixfs } from "@helia/unixfs";
import { type Identify, identify } from "@libp2p/identify";
import { webSockets } from "@libp2p/websockets";
import { type Multiaddr, multiaddr } from "@multiformats/multiaddr";
import { type HeliaLibp2p, createHelia } from "helia";
import { type Libp2p, createLibp2p } from "libp2p";
import { HelpCircle } from "lucide-react";
import { CID } from "multiformats/cid";
import { useRef, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { Tooltip } from "react-tooltip";
import { DownloadButton } from "../components/buttons/DownloadButton";
import { ValidatedInput } from "../components/form/ValidatedInput";
import { timeout } from "../lib/timeout";

// TODO: This is temporary. It will be automatically resolved when we start
// accepting deal ids.
const PROVIDER_DEFAULT_MULTIADDRT = "/ip4/127.0.0.1/tcp/8003/ws";

// Validate if Cid can be used by the retrieval
function validateCid(value: string): string {
  if (!value.trim()) {
    return "Payload CID is required";
  }

  if (!value.startsWith("baf")) {
    return "Invalid CID format - must start with 'baf'";
  }

  try {
    CID.parse(value);
    return ""; // Valid CID. I miss you my dear `Option` type.
  } catch (error) {
    return "Invalid CID format";
  }
}

export function Download() {
  const [carCid, setCarId] = useState<string>("");
  const [providerMultiaddr, setProviderMultiaddr] = useState<string>(PROVIDER_DEFAULT_MULTIADDRT);
  const [shouldExtract, setShouldExtract] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState(false);

  // Create a ref to access the validation method of the input component
  const cidInputRef = useRef<{ validateField: () => string }>(null);

  const downloadCar = async () => {
    // Validate the CID
    const error = cidInputRef.current?.validateField();
    if (error) {
      return;
    }

    try {
      setIsDownloading(true);
      toast.success("Downloading file");
      const payloadCid = CID.parse(carCid);
      const providers = providerMultiaddr
        .split(",")
        .map((s) => s.trim())
        .map(multiaddr);

      const { title, contents } = await retrieveContent(payloadCid, providers, shouldExtract);
      createDownloadTrigger(title, contents);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unknown error occurred during download");
        console.error(error);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-xl font-bold mb-4">Content retrieval</h2>
        <ValidatedInput
          ref={cidInputRef}
          id="car-id"
          label="Payload CID"
          value={carCid}
          onChange={setCarId}
          placeholder="bafybeiefli7iugocosgirzpny4t6yxw5zehy6khtao3d252pbf352xzx5q"
          helpText="Enter the payload CID (starts with 'baf')."
          validate={validateCid}
          tooltip={{
            content:
              "Content Identifier - the unique hash that identifies the content you want to retrieve. Payload CID != Piece CID.",
          }}
        />

        {/* TODO: Validate*/}
        <ValidatedInput
          id="provider-multiaddr-id"
          label="Providers"
          value={providerMultiaddr}
          onChange={setProviderMultiaddr}
          helpText="Multiple addresses can be separated by a comma — e.g. /ip4/145.69.4.20/tcp/8000,/ip4/215.69.4.20/tcp/8000"
          tooltip={{
            content: "The multiaddresses of storage providers storing the target file",
          }}
        />

        <div className="mb-4">
          <div className="flex items-center">
            <input
              id="extract-car"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={shouldExtract}
              onChange={(e) => setShouldExtract(e.target.checked)}
            />
            <label
              htmlFor="extract-car"
              className="ml-2 block text-sm text-gray-700 flex items-center gap-1"
            >
              Extract
              <span id="extract-tooltip" className="cursor-help inline-flex items-center ml-1">
                <HelpCircle className="inline w-4 h-4 text-gray-400" />
              </span>
              <Tooltip
                anchorSelect="#extract-tooltip"
                content="When checked, extracts the content. When unchecked, downloads the raw CAR file."
              />
            </label>
          </div>
        </div>

        <div className="mt-6">
          <DownloadButton
            onClick={downloadCar}
            disabled={isDownloading}
            text={isDownloading ? "Downloading..." : "Download"}
          />
        </div>
      </div>
      <Toaster position="top-center" reverseOrder={true} />
    </>
  );
}

async function setupHelia(): Promise<HeliaLibp2p<Libp2p<{ identify: Identify }>>> {
  // enable verbose logging in browser console to view debug logs
  // enable("ui*,libp2p*,-libp2p:connection-manager*,helia*,helia*:trace,-*:trace");

  // Create a libp2p node
  const libp2p = await createLibp2p({
    transports: [webSockets()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      identify: identify(),
    },
    // We are currently disabling the connection monitor because it uses ping
    // protocol under the hood. The storage-provider-server is not listening for pings.
    connectionMonitor: {
      enabled: false,
    },
  });

  // Create Helia wrapper around the libp2p node
  return await createHelia({
    libp2p,
    blockBrokers: [bitswap()],
    routers: [libp2pRouting(libp2p)],
  });
}

async function retrieveContentInner(
  helia: HeliaLibp2p<Libp2p<{ identify: Identify }>>,
  payloadCid: CID,
  providers: Multiaddr[],
  extractContents: boolean,
) {
  // Connect to the providers
  await Promise.all(
    providers.map(async (maddr) => {
      try {
        console.log("Connecting to provider ${provider}...");
        await helia.libp2p.dial(maddr);
        console.log("Connected!");
      } catch {
        console.error(`Failed to connect to ${maddr}`);
      }
    }),
  );

  const downloadContents = async () => {
    const contents = [];
    const extractor = extractContents ? unixfs(helia).cat : car(helia).stream;
    console.log("Fetching blocks and extracting contents...");
    for await (const buf of extractor(payloadCid)) {
      contents.push(buf);
    }
    return contents;
  };

  const contents = await timeout(
    downloadContents(),
    10000,
    new Error("Timed out while attempting to download the file!"),
  );

  return {
    title: extractContents ? payloadCid.toString() : `${payloadCid.toString()}.car`,
    contents: new Blob(contents),
  };
}

async function retrieveContent(
  payloadCid: CID,
  providers: Multiaddr[],
  extractContents = true,
): Promise<{ title: string; contents: Blob }> {
  const helia = await setupHelia();

  try {
    return await retrieveContentInner(helia, payloadCid, providers, extractContents);
  } catch (err) {
    console.error("Error retrieving CAR file:", err);
    throw err;
  } finally {
    // Clean up
    await helia.stop();
  }
}

function createDownloadTrigger(title: string, blob: Blob) {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a temporary anchor element to trigger download
  const a = document.createElement("a");
  a.href = url;
  // Name of the file
  a.download = title;
  document.body.appendChild(a);
  a.click();

  // Clean up
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
