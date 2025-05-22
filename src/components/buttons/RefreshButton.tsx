import { Button } from "./Button";

export function RefreshButton() {
  return (
    <Button onClick={() => window.location.reload()} variant="primary" size="md">
      Try again
    </Button>
  );
}
