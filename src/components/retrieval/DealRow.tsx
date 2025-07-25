import { Check, Copy, Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { Tooltip } from "react-tooltip";
import { blockToTime } from "../../lib/conversion";
import type { Deal } from "../../lib/deals";

interface DealRowProps {
  deal: Deal;
  latestFinalizedBlock: { number: number; timestamp: Date };
  onDownload: () => Promise<void>;
}

export function DealRow({ deal, latestFinalizedBlock, onDownload }: DealRowProps) {
  const id = deal.key.toString();
  const endTime = blockToTime(
    deal.value.end_block,
    latestFinalizedBlock.number,
    latestFinalizedBlock.timestamp,
  ).toLocaleString();
  const provider = deal.value.provider;
  const client = deal.value.client;

  // only active deals can be downloaded
  const canDownload = deal.value.state.type === "Active";

  return (
    <tr>
      <td className="px-3 py-2">{id}</td>
      <AddressCell label="provider" address={provider} id={id} />
      <AddressCell label={"client"} address={client} id={id} />
      <td className="px-3 py-2">{endTime}</td>
      <DownloadCell canDownload={canDownload} onDownload={onDownload} id={id} />
    </tr>
  );
}

interface AddressCellProps {
  label: string;
  address: string;
  id: string;
}

function AddressCell({ label, address, id }: AddressCellProps) {
  const [copied, setCopied] = useState(false);
  const truncatedAddress = `${address.slice(0, 8)}…${address.slice(-8)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <td className="px-3 py-2" data-tooltip-id={`${label}-${id}`} data-tooltip-content={address}>
      <span>{truncatedAddress}</span>
      <button type="button" onClick={handleCopy} className="p-1 ml-1 hover:text-blue-500">
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
      <Tooltip id={`${label}-${id}`} place="top" />
    </td>
  );
}

interface DownloadCellProps {
  canDownload: boolean;
  onDownload: () => Promise<void>;
  id: string;
}

function DownloadCell({ canDownload, onDownload, id }: DownloadCellProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const handleClick = async () => {
    if (!canDownload) return;
    setIsDownloading(true);
    try {
      await onDownload();
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };
  return (
    <td className="px-3 py-2 text-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={!canDownload}
        data-tooltip-id={`download-${id}`}
        data-tooltip-content={
          canDownload ? "Download file" : "Deal is published but not active yet"
        }
        className={`p-1 ${canDownload ? "hover:text-blue-500" : "opacity-50 cursor-not-allowed"}`}
      >
        {isDownloading ? (
          <Loader2 className="animate-spin w-5 h-5" />
        ) : downloaded ? (
          <Check className="w-5 h-5 text-green-500" />
        ) : (
          <Download className="w-5 h-5" />
        )}
      </button>
      <Tooltip id={`download-${id}`} place="top" />
    </td>
  );
}
