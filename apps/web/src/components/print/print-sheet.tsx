import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, type ReactNode } from "react";

// Opens the browser print dialog once `ready`, after every image (logos, photos) has loaded.
export function usePrintWhenReady(ready: boolean, title: string) {
  const printed = useRef(false);
  useEffect(() => {
    if (!ready || printed.current) return;
    document.title = title;
    const images = Array.from(document.images);
    void Promise.all(
      images.map((img) => (img.complete ? Promise.resolve() : new Promise((done) => { img.onload = img.onerror = () => done(null); }))),
    ).then(() => {
      printed.current = true;
      setTimeout(() => window.print(), 300);
    });
  }, [ready, title]);
}

// Status line shown instead of the sheet: preparing, failed or nothing to print.
export function PrintMessage({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "busy" }) {
  return (
    <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
      {tone === "busy" ? <CircularProgress /> : null}
      <Typography color={tone === "error" ? "error" : "text.primary"}>{children}</Typography>
    </Stack>
  );
}

// White print surface: page size/margins, hidden-on-paper toolbar (`.no-print`), colours kept in print.
// `css` carries the sheet-specific rules (tables, fonts).
export function PrintSheet({
  page,
  margin,
  css,
  hint,
  children,
}: {
  page: string;
  margin: string;
  css: string;
  hint: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box sx={{ bgcolor: "common.white", color: "common.black", fontFamily: "'Inter', 'Sarabun', sans-serif" }}>
      <style>{`
        @page { size: ${page}; margin: ${margin}; }
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        ${css}
      `}</style>
      <Stack direction="row" spacing={1} className="no-print" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
          {hint}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}
