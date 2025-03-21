import React, { useState } from 'react';
import { Tooltip } from 'react-tooltip';
import { HelpCircle } from 'lucide-react';

interface ValidatedInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  validate?: (value: string) => string;
  className?: string;
  tooltip?: {
    content: string;
  },
}

export const ValidatedInput = React.forwardRef<
  { validateField: () => string },
  ValidatedInputProps
>((props, ref) => {
  const [error, setError] = useState<string>('');
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    props.onChange(newValue);
    
    if (props.validate && newValue) {
      setError(props.validate(newValue));
    } else {
      setError('');
    }
  };
  
  // Method exposed via ref
  const validateField = (): string => {
    if (!props.validate) return '';
    
    const validationError = props.validate(props.value);
    setError(validationError);
    return validationError;
  };
  
  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    validateField
  }));
  
  return (
    <div className={`mb-4 ${props.className || ''}`}>
      <label htmlFor={props.id} className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
        {props.label}
        {props.tooltip && (
          <>
            <span id={`tooltip-${props.id}`} className="cursor-help inline-flex items-center ml-1">
              {props.tooltip.content !== "" && <HelpCircle className="inline w-4 h-4 text-gray-400" />}
            </span>
            <Tooltip anchorSelect={`#tooltip-${props.id}`} content={props.tooltip.content} />
          </>
        )}
      </label>
      <input
        id={props.id}
        type="text"
        className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${
          error ? "border-red-500" : ""
        }`}
        placeholder={props.placeholder}
        value={props.value}
        onChange={handleChange}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      ) : props.helpText ? (
        <p className="mt-1 text-xs text-gray-500">{props.helpText}</p>
      ) : null}
    </div>
  );
});