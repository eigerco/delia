import { web3FromAddress } from "@polkadot/extension-dapp";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import type { KeypairType } from "@polkadot/util-crypto/types";

type HexString = `0x${string}`;
export type SignatureWrapper =
  | { Sr25519: HexString }
  | { Ed25519: HexString }
  | { Ecdsa: HexString };

function getSignatureWrapper(signature: HexString, type: KeypairType): SignatureWrapper {
  switch (type) {
    case "sr25519":
      return { Sr25519: signature };
    case "ed25519":
      return { Ed25519: signature };
    case "ecdsa":
      return { Ecdsa: signature };
    default:
      throw new Error(`unsupported wrapper type: "${type}"`);
  }
}

export async function signRaw(
  account: InjectedAccountWithMeta,
  data: string,
): Promise<SignatureWrapper> {
  const injectedExt = await web3FromAddress(account.address);

  if (!injectedExt.signer.signRaw) {
    throw new Error("Signing is not supported by the extension");
  }

  if (!account.type) {
    throw new Error("Account type information is missing");
  }

  const { signature } = await injectedExt.signer.signRaw({
    address: account.address,
    data,
    type: "bytes",
  });

  return getSignatureWrapper(signature, account.type);
}
