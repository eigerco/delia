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
import { useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { DownloadButton } from "../components/buttons/DownloadButton";
import { unixfs } from "@helia/unixfs";
import { car } from "@helia/car";

// TODO: This is temporary. It will be automatically resolved when we start
// accepting deal ids.
const PROVIDER_DEFAULT_MULTIADDRT = "/ip4/127.0.0.1/tcp/8003/ws";

export function Download() {
  const carCidHint = "bafybeiefli7iugocosgirzpny4t6yxw5zehy6khtao3d252pbf352xzx5q";
  const [carCid, setCarId] = useState<string>("");
  const [providerMultiaddr, setProviderMultiaddr] = useState<string>(PROVIDER_DEFAULT_MULTIADDRT);
  const [shouldExtract, setShouldExtract] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadCar = async () => {
    if (!carCid.trim()) {
      toast.error("CAR Cid is required");
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

  const isDownloadDisabled = !carCid.trim() || isDownloading;

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-xl font-bold mb-4">Content retrieval</h2>
        <div className="mb-4">
          <label htmlFor="car-id" className="block text-sm font-medium text-gray-700 mb-1">
            Payload CID
          </label>
          <input
            id="car-id"
            type="text"
            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            placeholder={carCidHint}
            value={carCid}
            onChange={(e) => setCarId(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="provider-multiaddr-id"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Provider
          </label>
          <input
            id="provider-multiaddr-id"
            type="text"
            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            value={providerMultiaddr}
            onChange={(e) => setProviderMultiaddr(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <div className="flex items-center">
            <input
              id="extract-car"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={shouldExtract}
              onChange={(e) => setShouldExtract(e.target.checked)}
            />
            <label htmlFor="extract-car" className="ml-2 block text-sm text-gray-700">
              Extract
            </label>
          </div>
        </div>

        <div className="mt-6">
          <DownloadButton
            onClick={downloadCar}
            disabled={isDownloadDisabled}
            text={isDownloading ? "Downloading..." : "Download"}
          />
        </div>
      </div>
      <Toaster position="bottom-right" reverseOrder={true} />
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
