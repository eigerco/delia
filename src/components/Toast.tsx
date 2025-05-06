import { toast } from "react-hot-toast";

export function toastCustom(message: string, success: boolean) {
  toast.custom(
    (t) => (
      <div className="bg-white shadow rounded px-4 py-2 flex items-start justify-between gap-4 max-w-sm border">
        <div
          className={`text-sm break-words whitespace-normal overflow-hidden text-ellipsis ${
            success ? "text-green-700" : "text-red-700"
          }`}
        >
          {message}
        </div>
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          className="text-gray-500 hover:text-black text-sm"
        >
          ✖
        </button>
      </div>
    ),
    { duration: 5000 },
  );
}
