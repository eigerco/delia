import { type Multiaddr, multiaddr } from "@multiformats/multiaddr";
import { cborStream } from "it-cbor-stream";
import { createNode } from ".";

const SERVICES_DEFAULT_MULTIADDR = multiaddr("/ip4/127.0.0.1/tcp/62650/ws");
const SERVICES_REQUEST_RESPONSE_PROTOCOL = "/polka-storage/rr-services/1.0.0";

export namespace Services {
  export type ServiceInfo = { port: number; secure_url?: string };
  export type Services = {
    [key: string]: ServiceInfo | undefined;
  };
  export type StorageProviderServices = {
    rpc: ServiceInfo;
    upload: ServiceInfo;
  } & Services;

  export type ServicesRequest = "All";
  export type ServicesResponse = { services: Services };

  export async function sendRequest(
    request: ServicesRequest,
    remote: Multiaddr = SERVICES_DEFAULT_MULTIADDR,
  ): Promise<ServicesResponse> {
    const local = await createNode();
    const connection = await local.dialProtocol(remote, SERVICES_REQUEST_RESPONSE_PROTOCOL);
    const cbor = cborStream(connection);
    await cbor.write(request);
    return await cbor.read();
  }

  export function hasService<K extends string>(
    services: Services,
    key: K,
  ): services is Services & Record<K, ServiceInfo> {
    return key in services;
  }

  export function isStorageProviderService(
    services: Services,
  ): services is StorageProviderServices {
    return "upload" in services;
  }
}
