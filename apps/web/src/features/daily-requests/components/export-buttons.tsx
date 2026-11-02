import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PrintIcon from "@mui/icons-material/Print";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

// "พิมพ์ / Export PDF" + "ส่งออก CSV (Excel)", matching the Daily Reports action buttons.
export function ExportButtons({ onPrint, onCsv, disabled }: { onPrint: () => void; onCsv: () => void; disabled?: boolean }) {
  return (
    <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
      <Button
        variant="outlined"
        startIcon={<PrintIcon />}
        onClick={onPrint}
        disabled={disabled}
        sx={{ textTransform: "none" }}
        title="พิมพ์รายงานหรือบันทึกเป็น PDF (Print / Save as PDF)"
      >
        พิมพ์ / Export PDF
      </Button>
      <Button
        variant="contained"
        disableElevation
        startIcon={<FileDownloadIcon />}
        onClick={onCsv}
        disabled={disabled}
        sx={{ textTransform: "none", fontWeight: 600 }}
      >
        ส่งออก CSV (Excel)
      </Button>
    </Stack>
  );
}
