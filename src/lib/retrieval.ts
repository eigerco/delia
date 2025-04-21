import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { bitswap } from "@helia/block-brokers";
import { car } from "@helia/car";
import { libp2pRouting } from "@helia/routers";
import { unixfs } from "@helia/unixfs";
import { type Identify, identify } from "@libp2p/identify";
import { webSockets } from "@libp2p/websockets";
import type { Multiaddr } from "@multiformats/multiaddr";
import { type HeliaLibp2p, createHelia } from "helia";
import { type Libp2p, createLibp2p } from "libp2p";
import type { CID } from "multiformats/cid";

// We can move this out if&when used outside
function timeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutError = new Error("Promise timed out"),
): Promise<T> {
  // create a promise that rejects in milliseconds
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(timeoutError);
    }, ms);
  });

  // returns a race between timeout and the passed promise
  return Promise.race<T>([promise, timeout]);
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
    console.log("Fetching blocks and extracting contents...");
    const extractor = extractContents
      ? unixfs(helia).cat(payloadCid)
      : car(helia).stream(payloadCid);
    for await (const buf of extractor) {
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

export async function retrieveContent(
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
