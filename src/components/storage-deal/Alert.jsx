import React from 'react';
import { AlertCircle, CheckCircle2, X, Info } from 'lucide-react';

export function Alert({ variant = "info", title, children, onDismiss }) {
  const styles = {
    info: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800"
  };

  const icons = {
    info: <Info size={20} />,
    success: <CheckCircle2 size={20} />,
    error: <AlertCircle size={20} />
  };

  return (
    <div className={`${styles[variant]} p-4 rounded-lg mb-4 relative`}>
      <div className="flex items-center gap-2">
        {icons[variant]}
        <div className="font-bold">{title}</div>
        {variant === 'error' && (
          <button
            onClick={onDismiss}
            className="absolute right-2 top-2 p-1 hover:bg-red-200 rounded-full"
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}