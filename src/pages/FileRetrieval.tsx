import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useOutletContext } from "react-router";
import { DealList } from "../components/retrieval/DealList";

type OutletContextType = {
  accounts: InjectedAccountWithMeta[];
};

export function Retrieval() {
  const { accounts } = useOutletContext<OutletContextType>();
  return <DealList accounts={accounts} />;
}
