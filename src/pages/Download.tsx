import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { bitswap } from "@helia/block-brokers";
import { libp2pRouting } from "@helia/routers";
import { identify } from "@libp2p/identify";
import { enable } from "@libp2p/logger";
import { webSockets } from "@libp2p/websockets";
import { type Multiaddr, multiaddr } from "@multiformats/multiaddr";
import { createHelia } from "helia";
import { createLibp2p } from "libp2p";
import { CID } from "multiformats/cid";
import { useRef, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { DownloadButton } from "../components/buttons/DownloadButton";
import { ValidatedInput } from "../components/form/ValidatedInput";
import { unixfs } from "@helia/unixfs";
import { car } from "@helia/car";
import { Tooltip } from "../components/Tooltip";

// TODO: This is temporary. It will be automatically resolved when we start
// accepting deal ids.
const PROVIDER_DEFAULT_MULTIADDRT = "/ip4/127.0.0.1/tcp/8003/ws";

// Validate if Cid can be used by the retrieval
function validateCid (value: string): string {
  if (!value.trim()) {
    return "Payload CID is required";
  }

  if (!value.startsWith('baf')) {
    return "Invalid CID format - must start with 'baf'";
  }

  try {
    CID.parse(value);
    return ""; // Valid CID. I miss you my dear `Option` type.
  } catch (error) {
    return "Invalid CID format";
  }
};

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
      const provider = multiaddr(providerMultiaddr);

      const { title, contents } = await retrieveContent(payloadCid, provider, shouldExtract);
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
        />

        {/* TODO: Validate*/}
        <ValidatedInput
          id="provider-multiaddr-id"
          label="Provider"
          value={providerMultiaddr}
          onChange={setProviderMultiaddr}
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
            <label htmlFor="extract-car" className="ml-2 block text-sm text-gray-700 flex items-center gap-1">
              Extract
              <Tooltip content="When checked, extracts the content. When unchecked, downloads the raw CAR file." icon={true}/>
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

async function retrieveContent(payloadCid: CID, provider: Multiaddr, extractContents: boolean = true): Promise<{ title: string, contents: Blob }> {
  // enable verbose logging in browser console to view debug logs
  enable("ui*,libp2p*,-libp2p:connection-manager*,helia*,helia*:trace,-*:trace");

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
  const helia = await createHelia({
    libp2p,
    blockBrokers: [bitswap()],
    routers: [libp2pRouting(libp2p)],
  });

  try {
    // Connect to the provider
    console.log("Connecting to provider...");
    await helia.libp2p.dial(provider);
    console.log("Connected!");

    const contents = [];
    let title = payloadCid.toString();

    // If extraction is enabled, use fs.cat to extract the content
    if (extractContents) {
      console.log("Fetching blocks and extracting contents...");

      const fs = unixfs(helia);
      for await (const buf of fs.cat(payloadCid)) {
        contents.push(buf);
      }
    } else {
      console.log("Fetching car file...");

      title += ".car";
      const heliaCar = car(helia);
      for await (const buf of heliaCar.stream(payloadCid)) {
        contents.push(buf);
      }
    }

    return {
      title,
      contents: new Blob(contents)
    };
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
