import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function Alert({ variant = "info", title, children }) {
  const styles = {
    info: "bg-blue-100 text-blue-800",
    error: "bg-red-100 text-red-800",
  };

  return (
    <div className={`${styles[variant]} p-4 rounded-lg mb-4`}>
      <div className="flex items-center gap-2">
        {variant === "error" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
        <div className="font-bold">{title}</div>
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
