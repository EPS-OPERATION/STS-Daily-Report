import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";

// One error shape for every page-level query: message + optional retry.
export function QueryError({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <Alert
      severity="error"
      sx={{ mb: 2 }}
      action={onRetry ? <Button color="inherit" onClick={onRetry}>Retry</Button> : undefined}
    >
      โหลดข้อมูลไม่สำเร็จ — {error.message}
    </Alert>
  );
}
