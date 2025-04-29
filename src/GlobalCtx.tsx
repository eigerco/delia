import type { ApiPromise, WsProvider } from "@polkadot/api";
import type { TypeRegistry } from "@polkadot/types";
import { formatBalance } from "@polkadot/util";
import { createContext, useContext } from "react";
import { GlobalCtxProvider, type Status } from "./GlobalCtxProvider";

export class TokenProperties {
  tokenSymbol: string;
  tokenDecimals: number;

  constructor(args: { tokenSymbol: string; tokenDecimals: number }) {
    this.tokenSymbol = args.tokenSymbol;
    this.tokenDecimals = args.tokenDecimals;
  }

  // `default` is a reserved keyword
  static preset(): TokenProperties {
    return new TokenProperties({
      tokenSymbol: "UNIT",
      tokenDecimals: 12,
    });
  }

  /** Query the Polkadot API for the chain properties, will throw if either are missing */
  static async fromApi(api: ApiPromise): Promise<TokenProperties> {
    const systemProperties = await api.rpc.system.properties();
    return new TokenProperties({
      // We have a single token, hence the [0]
      tokenDecimals: systemProperties.tokenDecimals.unwrap()[0].toNumber(),
      tokenSymbol: systemProperties.tokenSymbol.unwrap()[0].toString(),
    });
  }

  /** Converts a given value in the chain's respective UNIT to Plancks (amount denoted by the `tokenDecimals` field). */
  unitToPlanck(unit: number | bigint): number {
    const plancksPerUnit = 1 ** this.tokenDecimals;
    const plancksPerUnitBI = BigInt(plancksPerUnit);
    const valueBigInt = typeof unit === "number" ? BigInt(unit) : unit;

    const whole = valueBigInt / plancksPerUnitBI;
    const fraction = valueBigInt % plancksPerUnitBI;

    const wholeNumber = Number(whole);
    const fractionNumber = Number(fraction) / plancksPerUnit;

    return wholeNumber + fractionNumber;
  }

  planckToUnit(planck: number): number {
    return planck / this.tokenDecimals;
  }

  formatUnit(unit: number | bigint, withSi = false): string {
    if (unit === 0 || unit === 0n) {
      // 0 never gets a unit assigned to it
      return `0 ${this.tokenSymbol}`;
    }
    // using `withSi: false` removes the unit,
    // regardless of forceUnit
    const unitOptions = withSi
      ? {
          withUnit: this.tokenSymbol,
          withSi: true,
        }
      : {
          forceUnit: this.tokenSymbol,
        };
    const options = {
      decimals: this.tokenDecimals,
      withZero: false,
      ...unitOptions,
    };

    return formatBalance(unit, options);
  }
}

export type Ctx = {
  registry: TypeRegistry;
  wsAddress: string;
  latestFinalizedBlock: { number: number; timestamp: Date } | null;
  collatorWsProvider: WsProvider | null;
  collatorWsApi: ApiPromise | null;
  collatorConnectionStatus: Status;
  tokenProperties: TokenProperties;
};

export const GlobalCtx = createContext<Ctx | null>(null);

export function useCtx() {
  const ctx = useContext(GlobalCtx);
  if (!ctx) {
    throw new Error(`${useCtx.name} must be within a ${GlobalCtxProvider.name}`);
  }
  return ctx;
}
