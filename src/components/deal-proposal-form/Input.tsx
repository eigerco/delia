import { HelpCircle } from "lucide-react";
import type { PropsWithChildren } from "react";
import type { FieldError, Path, UseFormRegister } from "react-hook-form";
import { Tooltip } from "react-tooltip";
import type { FormValues } from "./types";

type HookInputProps = {
  id: Path<FormValues>;
  register: UseFormRegister<FormValues>;
  error: FieldError | undefined;
  type?: string;
  disabled?: boolean;
  readonly?: boolean;
  tooltip?: string;
  required?: boolean;
  placeholder?: string;
};

export function HookInput({
  id,
  type = "text",
  disabled = false,
  placeholder,
  tooltip,
  children,
  register,
  required,
  readonly,
  error,
}: PropsWithChildren<HookInputProps>) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
      >
        {children}
        {tooltip && (
          <>
            <span id={`tooltip-${id}`} className="cursor-help inline-flex items-center ml-1">
              <HelpCircle className="inline w-4 h-4 text-gray-400" />
            </span>
            <Tooltip anchorSelect={`#tooltip-${id}`} content={tooltip} />
          </>
        )}
      </label>
      <input
        id={id}
        type={type}
        disabled={disabled}
        className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${
          disabled ? "bg-gray-100 cursor-not-allowed" : ""
        } ${error ? "border-red-500 focus:ring-red-500" : "border-gray-300"}`}
        readOnly={readonly}
        required={required}
        placeholder={placeholder}
        {...register(id)}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error.message?.toString() || "This field is invalid"}
        </p>
      )}
    </div>
  );
}
