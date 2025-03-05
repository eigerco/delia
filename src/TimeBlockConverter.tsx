import React, { useState, useEffect, useRef, useMemo } from "react";
import { Info, Clock, Blocks, Calculator, AlertTriangle } from "lucide-react";

const MAX_DURATION = 1800; // Maximum block duration

const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const hourStr = hour.toString().padStart(2, "0");
      const minStr = minute.toString().padStart(2, "0");
      options.push({
        value: `${hourStr}:${minStr}`,
        label: `${hourStr}:${minStr}`,
      });
    }
  }
  return options;
};

const roundToNearestThirtyMinutes = (date) => {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.round(minutes / 30) * 30;
  const newDate = new Date(date);
  newDate.setMinutes(roundedMinutes);
  newDate.setSeconds(0);
  newDate.setMilliseconds(0);
  return newDate;
};

const formatTime = (date) => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

const TimeBlockConverter = ({ dealProposal, onChange }) => {
  const [useBlocks, setUseBlocks] = useState(false);
  const [currentBlock, setCurrentBlock] = useState(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  const BLOCK_TIME = 6; // seconds

  const timeOptions = useMemo(() => generateTimeOptions(), []);

  useEffect(() => {
    let mounted = true;

    const connectWebSocket = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      wsRef.current = new WebSocket("ws://127.0.0.1:42069");

      wsRef.current.onopen = () => {
        console.log("Connected to chain for block number");
        if (mounted) {
          wsRef.current.send(
            JSON.stringify({
              jsonrpc: "2.0",
              id: "block_height",
              method: "chain_getHeader",
              params: [],
            }),
          );

          intervalRef.current = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  jsonrpc: "2.0",
                  id: "block_height",
                  method: "chain_getHeader",
                  params: [],
                }),
              );
            }
          }, 30000);
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const response = JSON.parse(event.data);
          console.log("Chain response:", response);

          if (mounted && response?.result?.number) {
            const blockNumber = parseInt(response.result.number, 16);
            console.log("Current block:", blockNumber);
            setCurrentBlock(blockNumber);
          }
        } catch (err) {
          console.error("Failed to parse block data:", err);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("Block websocket error:", error);
      };
    };

    connectWebSocket();

    return () => {
      mounted = false;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;

        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      }
    };
  }, []);

  useEffect(() => {
    if (currentBlock && (!dealProposal.start_block || !dealProposal.end_block)) {
      const defaultStart = currentBlock + 100;
      const defaultEnd = currentBlock + 1000;

      onChange({
        ...dealProposal,
        start_block: dealProposal.start_block || defaultStart,
        end_block: dealProposal.end_block || defaultEnd,
      });
    }
  }, [currentBlock, dealProposal.start_block, dealProposal.end_block, onChange]);

  const calculateTotalCost = () => {
    const blockDuration = dealProposal.end_block - dealProposal.start_block;
    const totalCost = blockDuration * dealProposal.storage_price_per_block;
    return {
      blocks: blockDuration,
      cost: totalCost,
    };
  };

  const isDurationExceeded = () => {
    const duration = dealProposal.end_block - dealProposal.start_block;
    return duration > MAX_DURATION;
  };

  const getDateFromBlocksAhead = (block) => {
    if (!currentBlock) return new Date();
    const blocksAhead = block - currentBlock;
    const now = new Date();
    const date = new Date(now.getTime() + blocksAhead * BLOCK_TIME * 1000);
    return roundToNearestThirtyMinutes(date);
  };

  const getBlocksFromDate = (date) => {
    if (!currentBlock) return currentBlock;
    const now = new Date();
    const timeDiff = date.getTime() - now.getTime();
    const blocksAhead = Math.floor(timeDiff / (BLOCK_TIME * 1000));
    return currentBlock + Math.max(0, blocksAhead);
  };

  const handleDateChange = (dateStr, isStart) => {
    const currentDate = isStart
      ? getDateFromBlocksAhead(dealProposal.start_block)
      : getDateFromBlocksAhead(dealProposal.end_block);

    const newDate = new Date(dateStr);
    newDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0);

    const newBlock = getBlocksFromDate(newDate);
    if (isStart) {
      onChange({ ...dealProposal, start_block: newBlock });
    } else {
      onChange({ ...dealProposal, end_block: newBlock });
    }
  };

  const handleTimeChange = (timeStr, isStart) => {
    const currentDate = isStart
      ? getDateFromBlocksAhead(dealProposal.start_block)
      : getDateFromBlocksAhead(dealProposal.end_block);

    const [hours, minutes] = timeStr.split(":");
    currentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const newBlock = getBlocksFromDate(currentDate);
    if (isStart) {
      onChange({ ...dealProposal, start_block: newBlock });
    } else {
      onChange({ ...dealProposal, end_block: newBlock });
    }
  };

  const getRelativeBlocks = (block) => {
    if (!currentBlock) return "";
    const diff = block - currentBlock;
    if (diff < 0) return "Invalid block (in past)";

    const minutes = Math.floor((diff * BLOCK_TIME) / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `~${days} days (${diff} blocks)`;
    if (hours > 0) return `~${hours} hours (${diff} blocks)`;
    if (minutes > 0) return `~${minutes} minutes (${diff} blocks)`;
    return `${diff} blocks`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {useBlocks ? (
            <Blocks size={16} className="text-gray-500" />
          ) : (
            <Clock size={16} className="text-gray-500" />
          )}
          <h3 className="text-sm font-medium text-gray-700">
            {useBlocks ? "Block Numbers" : "Time Period"}
          </h3>
        </div>

        <button
          onClick={() => setUseBlocks(!useBlocks)}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
        >
          <span>Switch to {useBlocks ? "Time" : "Blocks"}</span>
        </button>
      </div>

      <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-md">
        <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-700">
          {!currentBlock ? (
            <div className="flex items-center gap-2">
              <Clock className="animate-spin" size={16} />
              <span>Syncing with chain...</span>
            </div>
          ) : (
            <>
              <p>Current block: {currentBlock}</p>
              <p className="mt-1">Block time ≈ 6 seconds</p>
            </>
          )}
        </div>
      </div>

      {isDurationExceeded() && (
        <div className="flex items-start gap-2 p-2 bg-red-50 rounded-md">
          <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700">
            Deal duration exceeds maximum allowed length of {MAX_DURATION} blocks
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {useBlocks ? "Start Block" : "Start Time"}
          </label>
          {useBlocks ? (
            <input
              type="number"
              value={dealProposal.start_block}
              onChange={(e) =>
                onChange({
                  ...dealProposal,
                  start_block: parseInt(e.target.value),
                })
              }
              min={currentBlock}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={
                    getDateFromBlocksAhead(dealProposal.start_block).toISOString().split("T")[0]
                  }
                  onChange={(e) => handleDateChange(e.target.value, true)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                  value={formatTime(getDateFromBlocksAhead(dealProposal.start_block))}
                  onChange={(e) => handleTimeChange(e.target.value, true)}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                >
                  {timeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-gray-500">
                {getRelativeBlocks(dealProposal.start_block)}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {useBlocks ? "End Block" : "End Time"}
          </label>
          {useBlocks ? (
            <input
              type="number"
              value={dealProposal.end_block}
              onChange={(e) =>
                onChange({
                  ...dealProposal,
                  end_block: parseInt(e.target.value),
                })
              }
              min={dealProposal.start_block}
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={getDateFromBlocksAhead(dealProposal.end_block).toISOString().split("T")[0]}
                  onChange={(e) => handleDateChange(e.target.value, false)}
                  min={getDateFromBlocksAhead(dealProposal.start_block).toISOString().split("T")[0]}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                  value={formatTime(getDateFromBlocksAhead(dealProposal.end_block))}
                  onChange={(e) => handleTimeChange(e.target.value, false)}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                >
                  {timeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-gray-500">
                {getRelativeBlocks(dealProposal.end_block)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cost Estimation */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Calculator size={16} className="text-gray-500" />
          <h3 className="text-sm font-medium text-gray-700">Cost Estimation</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Duration:</span>
            <span className="ml-2 font-mono">{calculateTotalCost().blocks} blocks</span>
          </div>
          <div>
            <span className="text-gray-500">Total Cost:</span>
            <span className="ml-2 font-mono">
              {calculateTotalCost().cost.toLocaleString()} tokens
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeBlockConverter;
