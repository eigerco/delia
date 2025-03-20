import { HelpCircle } from "lucide-react";
import { useState } from "react";

type TooltipProps = {
  content: string;
  children?: React.ReactNode;
  icon?: boolean;
};

export function Tooltip({ content, children, icon = false }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <div 
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help inline-flex items-center"
      >
        {children || (icon && <HelpCircle className="inline w-4 h-4 text-gray-400" />)}
      </div>
      {isVisible && (
        <div className="absolute z-10 bottom-full mb-2 px-3 py-2 text-sm bg-black text-white rounded shadow-lg min-w-xs">
          {content}
          <div className="absolute bottom- transform -translate-x-1/2 w-3 h-3 rotate-45 bg-black" />
        </div>
      )}
    </div>
  );
}