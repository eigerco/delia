import { type Control, Controller, type FieldError, type Path } from "react-hook-form";
import type { FormValues } from "./types";

interface DurationFieldProps {
  name: Path<FormValues>;
  label?: string;
  required?: boolean;
  defaultValue?: DurationValue;
  disabled?: boolean;
  className?: string;
  maxMonths?: number;
  maxDays?: number;
  control: Control<FormValues>;
  error?: FieldError;
}

export interface DurationValue {
  months: number;
  days: number;
}

const DurationInput = ({
  name,
  label,
  control,
  error,
  required = true,
  defaultValue = { months: 0, days: 0 },
  maxMonths = 99,
  maxDays = 31,
}: DurationFieldProps) => {
  return (
    <div className="duration-field">
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue}
        render={({ field }) => {
          const { value, onChange } = field;

          // Ensure we have a proper value object
          const durationValue = (value as DurationValue) || defaultValue;

          return (
            <>
              <div className="flex items-center mt-1 space-x-4">
                {/* Months input */}
                <div className="flex items-center">
                  <input
                    type="number"
                    min="0"
                    max={maxMonths}
                    className="w-full p-2 border rounded border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    value={durationValue.months}
                    onChange={(e) => {
                      onChange({ ...durationValue, months: e.target.value });
                    }}
                    aria-label="Months"
                    placeholder="0"
                  />
                  <span className="ml-2 text-sm">months</span>
                </div>

                {/* Days input */}
                <div className="flex items-center">
                  <input
                    type="number"
                    min="0"
                    max={maxDays}
                    className="w-full p-2 border rounded border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    value={durationValue.days}
                    onChange={(e) => {
                      onChange({ ...durationValue, days: e.target.value });
                    }}
                    aria-label="Days"
                    placeholder="0"
                  />
                  <span className="ml-2 text-sm">days</span>
                </div>
              </div>

              {error && (
                <p className="mt-1 text-sm text-red-600">
                  {error.message || "This field is required"}
                </p>
              )}
            </>
          );
        }}
      />
    </div>
  );
};

export default DurationInput;
