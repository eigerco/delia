import React, { useState } from 'react';

interface ValidatedInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
  validate?: (value: string) => string;
  className?: string;
}

// export const ValidatedInput: React.FC<ValidatedInputProps> = ({
//   id,
//   label,
//   value,
//   onChange,
//   placeholder,
//   helpText,
//   validate,
//   className = '',
// }) => {
//   // Validation error
//   const [error, setError] = useState<string>('');

//   // Executed each time that the text is changed in the field
//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const newValue = e.target.value;
//     onChange(newValue);
    
//     if (validate && newValue) {
//       setError(validate(newValue));
//     } else {
//       setError('');
//     }
//   };

//   // // Public method that can be called by parent components
//   // const validateField = (): string => {
//   //   if (!validate) return '';
    
//   //   const validationError = validate(value);
//   //   setError(validationError);
//   //   return validationError;
//   // };

//   return (
//     <div className={`mb-4 ${className}`}>
//       <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
//         {label}
//       </label>
//       <input
//         id={id}
//         type="text"
//         className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${
//           error ? "border-red-500" : ""
//         }`}
//         placeholder={placeholder}
//         value={value}
//         onChange={handleChange}
//       />
//       {error ? (
//         <p className="mt-1 text-xs text-red-500">{error}</p>
//       ) : helpText ? (
//         <p className="mt-1 text-xs text-gray-500">{helpText}</p>
//       ) : null}
//     </div>
//   );
// };

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
      <label htmlFor={props.id} className="block text-sm font-medium text-gray-700 mb-1">
        {props.label}
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