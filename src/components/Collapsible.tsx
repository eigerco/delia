import { useState } from "react";

const Collapsible = ({ title, children }: React.PropsWithChildren<{ title: string }>) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div className="mb-1">
      <button
        type="button"
        className="flex justify-between w-full py-1 px-2 text-left text-sm items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {title}
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
          role="img"
        >
          <title>Toggle section</title>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="border-2 border-gray-300 rounded-md pt-1 pb-2 px-2 mt-1 overflow-hidden max-h-80">
          {children}
        </div>
      )}
    </div>
  );
};

export default Collapsible;
