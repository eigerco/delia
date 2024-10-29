import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export const STEPS = [
  { id: 1, name: 'Connect Wallet' },
  { id: 2, name: 'Connect to Provider' },
  { id: 3, name: 'Propose Deal' },
  { id: 4, name: 'Publish Deal' }
];

export function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step) => (
        <div
          key={step.id}
          className={`flex items-center ${step.id === currentStep
              ? 'text-blue-600'
              : step.id < currentStep
                ? 'text-green-600'
                : 'text-gray-400'
            }`}
        >
          <div
            className={`flex items-center justify-center w-8 h-8 border-2 rounded-full ${step.id === currentStep
                ? 'border-blue-600'
                : step.id < currentStep
                  ? 'border-green-600'
                  : 'border-gray-400'
              }`}
          >
            {step.id < currentStep ? (
              <CheckCircle2 size={16} />
            ) : (
              step.id
            )}
          </div>
          <span className="ml-2 text-sm">{step.name}</span>
        </div>
      ))}
    </div>
  );
}
