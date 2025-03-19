import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { bitswap } from "@helia/block-brokers";
import { car } from "@helia/car";
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

// TODO: This is temporary. It will be automatically resolved when we start
// accepting deal ids.
const PROVIDER_DEFAULT_MULTIADDRT = "/ip4/127.0.0.1/tcp/8003/ws";

export function Download() {
  const [carCid, setCarId] = useState<string>(
    "bafkreiechz74drg7tg5zswmxf4g2dnwhemlwdv7e3l5ypehdqdwaoyz3dy",
  );
  const [providerMultiaddr, setProviderMultiaddr] = useState<string>(PROVIDER_DEFAULT_MULTIADDRT);
  const [loading, setLoading] = useState(false);

  const downloadCar = async () => {
    if (!carCid.trim()) {
      toast.error("CAR Cid is required");
      return;
    }

    try {
      setLoading(true);
      toast.success("Downloading file");

      const payloadCid = CID.parse(carCid);
      const provider = multiaddr(providerMultiaddr);

      const blob = await retrieveContent(payloadCid, provider);
      createDownloadTrigger(payloadCid, blob);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unknown error occurred during download");
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const isDownloadDisabled = !carCid.trim() || loading;

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6 mb-4">
        <h2 className="text-xl font-bold mb-4">Download CAR</h2>
        <div className="mb-4">
          <label htmlFor="car-id" className="block text-sm font-medium text-gray-700 mb-1">
            Payload CID
          </label>
          <input
            id="car-id"
            type="text"
            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
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

        <div className="mt-6">
          <DownloadButton
            onClick={downloadCar}
            disabled={isDownloadDisabled}
            text={loading ? "Downloading..." : "Download"}
          />
        </div>
      </div>
      <Toaster position="bottom-right" reverseOrder={true} />
    </>
  );
}

async function retrieveContent(payloadCid: CID, provider: Multiaddr): Promise<Blob> {
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

  const fs = unixfs(helia);

  try {
    // Connect to the provider
    console.log("Connecting to provider...");
    await helia.libp2p.dial(provider);
    console.log("Connected!");

    const content = [];
    console.log("Fetching content...");
    for await (const buf of fs.cat(payloadCid)) {
      content.push(buf);
    }

    return new Blob(content);
  } catch (err) {
    console.error("Error retrieving CAR file:", err);
    throw err;
  } finally {
    // Clean up
    await helia.stop();
  }
}

function createDownloadTrigger(payloadCid: CID, blob: Blob) {
  // Create a URL for the blob
  const url = URL.createObjectURL(blob);

  // Create a temporary anchor element to trigger download
  const a = document.createElement("a");
  a.href = url;
  // Name of the file
  a.download = `${payloadCid.toString()}`;
  document.body.appendChild(a);
  a.click();

  // Clean up
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
