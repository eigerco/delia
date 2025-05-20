import { Toaster as HotToaster, ToastBar, type ToastType } from "react-hot-toast";

function colorText(ty: ToastType): string {
  switch (ty) {
    case "success":
      return "text-green-600";
    case "error":
      return "text-red-600";
    default:
      return "";
  }
}

export default function Toaster() {
  return (
    <HotToaster
      position="top-center"
      reverseOrder={true}
      toastOptions={{ success: { duration: 5000 }, error: { duration: 5000 } }}
    >
      {(t) => (
        <ToastBar toast={t}>
          {({ icon, message }) => (
            <>
              <div
                className={`flex items-center text-base break-words whitespace-normal overflow-hidden text-ellipsis ${colorText(t.type)}`}
              >
                {icon}
                {message}
              </div>
            </>
          )}
        </ToastBar>
      )}
    </HotToaster>
  );
}
