import Button from "@mui/material/Button";

// Small "go there" action on the footer warnings.
export function GoToButton({ onClick }: { onClick: () => void }) {
  return (
    <Button color="inherit" size="small" onClick={onClick} sx={{ py: 0, whiteSpace: "nowrap" }}>
      ไปที่หัวข้อ
    </Button>
  );
}
