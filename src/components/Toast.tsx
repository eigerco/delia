import type { ReactNode } from "react";

export enum ToastState {
  Loading = "loading",
  Success = "success",
  Error = "error",
}

export function ToastMessage({
  message,
  state,
}: {
  message: ReactNode;
  state: ToastState;
}) {
  return (
    <div className="px-4 py-2 flex items-start justify-between gap-4 max-w-sm">
      <div
        className={`text-sm break-words whitespace-normal overflow-hidden text-ellipsis ${getToastColour(
          state,
        )}`}
      >
        {message}
      </div>
    </div>
  );
}

function getToastColour(state: ToastState): string {
  switch (state) {
    case ToastState.Loading:
      return "text-gray-700";
    case ToastState.Success:
      return "text-green-700";
    case ToastState.Error:
      return "text-red-700";
  }
}
