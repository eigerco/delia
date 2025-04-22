import type { ApiPromise } from "@polkadot/api";
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { formatBalance } from "@polkadot/util";
import { useEffect, useState } from "react";

export function MarketBalance({
  account,
  api,
}: {
  account: InjectedAccountWithMeta | null;
  api: ApiPromise | null;
}) {
  const [marketBalance, setMarketBalance] = useState<string>("");

  useEffect(() => {
    const fetchMarketBalance = async () => {
      if (account && api) {
        try {
          setMarketBalance("(loading...)");

          const result = await api.query.market.balanceTable(account.address);
          const json = result.toJSON() as Record<string, unknown>;
          const free = (json.free as string) ?? "0";
          setMarketBalance(free);
        } catch (err) {
          console.error("Error fetching market balance:", err);
          setMarketBalance("Error");
        }
      } else {
        setMarketBalance("");
      }
    };

    fetchMarketBalance();
  }, [account, api]);

  if (!account) return null;

  if (marketBalance === "Error") {
    return <p className="mt-1 text-sm text-red-500">Error loading market balance</p>;
  }

  if (marketBalance === "(loading...)") {
    return <p className="mt-1 text-sm text-gray-400">Loading market balance...</p>;
  }

  if (/^\d+$/.test(marketBalance)) {
    return (
      <p className="mt-1 text-sm text-gray-500">
        Market Balance: {formatBalance(marketBalance, {})}
      </p>
    );
  }

  return null;
}
