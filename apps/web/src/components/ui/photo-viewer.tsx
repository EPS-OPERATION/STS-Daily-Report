import CloseIcon from "@mui/icons-material/CloseOutlined";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";

/** Full-size look at one photo (tap a thumbnail). Dark backdrop, the whole image fits the screen, tap anywhere to close. */
export function PhotoViewer({ src, alt, onClose }: { src: string | null; alt?: string; onClose: () => void }) {
  return (
    <Dialog open={Boolean(src)} onClose={onClose} maxWidth={false}
      slotProps={{ paper: { sx: { bgcolor: "transparent", boxShadow: "none", m: 1, maxWidth: "calc(100vw - 16px)", maxHeight: "calc(100dvh - 16px)", overflow: "visible" } } }}>
      <IconButton aria-label="ปิดรูป" onClick={onClose}
        sx={{ position: "fixed", top: 12, right: 12, bgcolor: "background.paper", "&:hover": { bgcolor: "background.paper" } }}>
        <CloseIcon />
      </IconButton>
      {src ? (
        <Box component="img" src={src} alt={alt ?? ""} onClick={onClose}
          sx={{ display: "block", maxWidth: "calc(100vw - 16px)", maxHeight: "calc(100dvh - 16px)", objectFit: "contain", borderRadius: 1, cursor: "zoom-out" }} />
      ) : null}
    </Dialog>
  );
}
