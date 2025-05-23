import type React from "react";

type ButtonVariant = "primary" | "secondary" | "success" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = React.PropsWithChildren<{
  disabled?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  tooltip?: string;
  id?: string;
}>;

export function Button({
  disabled = false,
  onClick,
  className = "",
  variant = "primary",
  size = "md",
  loading = false,
  tooltip = "",
  children,
}: ButtonProps) {
  const baseClasses = "transition font-medium rounded flex items-center justify-center";

  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-2 text-sm",
    lg: "px-4 py-2.5 text-base",
  };

  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    success: "bg-green-600 text-white hover:bg-green-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  const disabledClasses = "bg-gray-300 text-gray-500 cursor-not-allowed";

  const isDisabled = disabled || loading;

  // Decide whether to show the tooltip
  const showTooltip = tooltip;

  // Wrapper for tooltip
  const ButtonWithWrapper = ({ children }: { children: React.ReactNode }) => {
    if (showTooltip) {
      return (
        <div className="relative group">
          {children}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            {tooltip}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-solid border-transparent border-t-gray-800" />
          </div>
        </div>
      );
    }
    return <>{children}</>;
  };

  return (
    <ButtonWithWrapper>
      <button
        type="button"
        className={`${baseClasses} ${sizeClasses[size]} ${
          isDisabled ? disabledClasses : variantClasses[variant]
        } ${className}`}
        onClick={onClick}
        disabled={isDisabled}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-labelledby="loading-icon"
              role="img"
            >
              <title id="loading-icon">Loading spinner</title>
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {children}
          </>
        ) : (
          children
        )}
      </button>
    </ButtonWithWrapper>
  );
}
