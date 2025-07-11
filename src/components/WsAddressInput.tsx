import { useEffect, useState } from "react";
import { useCtx } from "../GlobalCtx";

export function WsAddressInput() {
  const { wsAddress, setWsAddress } = useCtx();

  // We use a local state copy so users can type freely
  // without triggering a reconnect on every keystroke.
  const [localValue, setLocalValue] = useState(wsAddress);

  // Keep localValue in sync with context if it changes externally
  useEffect(() => {
    setLocalValue(wsAddress);
  }, [wsAddress]);

  return (
    <>
      <label htmlFor="ws-address" className="text-gray-700 mr-2">
        Address
      </label>
      <input
        id="ws-address"
        type="text"
        className="p-1 border rounded focus:ring-blue-500 focus:border-blue-500 mr-2"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => setWsAddress(localValue)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setWsAddress(localValue);
          }
        }}
      />
    </>
  );
}
