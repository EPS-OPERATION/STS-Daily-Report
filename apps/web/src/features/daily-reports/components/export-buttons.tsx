import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PrintIcon from "@mui/icons-material/Print";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

// "พิมพ์รายงาน" + "ส่งออก CSV (Excel)", the same pair as the Daily Reports work-done table.
export function ExportButtons({ onPrint, onCsv, disabled }: { onPrint: () => void; onCsv: () => void; disabled?: boolean }) {
  return (
    <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
      <Button variant="outlined" startIcon={<PrintIcon />} onClick={onPrint} disabled={disabled} sx={{ textTransform: "none" }}>
        พิมพ์รายงาน
      </Button>
      <Button variant="contained" disableElevation startIcon={<FileDownloadIcon />} onClick={onCsv} disabled={disabled} sx={{ textTransform: "none", fontWeight: 600 }}>
        ส่งออก CSV (Excel)
      </Button>
    </Stack>
  );
}
