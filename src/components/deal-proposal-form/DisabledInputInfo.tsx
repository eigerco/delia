import { HelpCircle } from "lucide-react";
import { Tooltip } from "react-tooltip";

export const DisabledInputInfo = ({
  name,
  tooltip,
  value,
  label,
}: { name: string; tooltip?: string; value: string; label: string }) => {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
      >
        {label}
        {tooltip && (
          <>
            <span id={`tooltip-${name}`} className="cursor-help inline-flex items-center ml-1">
              <HelpCircle className="inline w-4 h-4 text-gray-400" />
            </span>
            <Tooltip anchorSelect={`#tooltip-${name}`} content={tooltip} />
          </>
        )}
      </label>
      <input
        id={name}
        disabled
        className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 bg-gray-100 cursor-not-allowed"
        value={value}
      />
    </div>
  );
};
