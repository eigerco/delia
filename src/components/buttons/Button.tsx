import type React from "react";

type ButtonProps = React.PropsWithChildren<{
  disabled: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
}>;
export function Button({ disabled, onClick, className, children }: ButtonProps) {
  return (
    <button
      type="button"
      className={`${className && ""} px-4 py-2 bg-blue-200 rounded-sm ${
        disabled ? "bg-gray-400 cursor-not-allowed" : "hover:bg-blue-600 hover:text-white"
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
