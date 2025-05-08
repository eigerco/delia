import { HelpCircle } from "lucide-react";
import { Tooltip } from "react-tooltip";

type ExtractCheckboxProps = { extract: boolean; setExtract: (extract: boolean) => void };
export function ExtractCheckbox({ extract, setExtract }: ExtractCheckboxProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        id="extract-car"
        type="checkbox"
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        checked={extract}
        onChange={(e) => setExtract(e.target.checked)}
      />
      <label htmlFor="extract-car" className="flex gap-1 text-sm text-gray-700 items-center">
        Extract
        <span id="extract-tooltip" className="cursor-help">
          <HelpCircle className="w-4 h-4 text-gray-400" />
        </span>
        <Tooltip
          anchorSelect="#extract-tooltip"
          content="When checked, extracts the content. When unchecked, downloads the raw CAR file."
        />
      </label>
    </div>
  );
}
