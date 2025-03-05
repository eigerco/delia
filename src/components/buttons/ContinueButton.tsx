export function ContinueButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      className={`px-4 py-2 bg-blue-200 rounded-sm ${
        disabled ? "bg-gray-400 cursor-not-allowed" : "hover:bg-blue-600"
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      Continue
    </button>
  );
}
