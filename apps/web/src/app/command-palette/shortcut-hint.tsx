import Box from "@mui/material/Box";
import { useEffect, useState } from "react";

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /mac|iphone|ipad/i.test(navigator.platform) || /mac/i.test(navigator.userAgent);
}

// Global Ctrl+K / Cmd+K toggle. Ignores keystrokes when the palette handles
// them itself (Dialog open state is owned by the caller).
export function useCommandPaletteShortcut(open: boolean, setOpen: (v: boolean) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);
}

// "Ctrl K" on Windows/Linux, "⌘K" on macOS — styled as a keyboard key chip.
export function PaletteShortcutHint() {
  const [mac, setMac] = useState(false);
  useEffect(() => {
    setMac(isMacPlatform());
  }, []);
  return (
    <Box
      component="kbd"
      sx={{
        fontFamily: "inherit",
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.6,
        color: "text.secondary",
        bgcolor: "grey.100",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 0.75,
        px: 0.75,
        py: 0,
        whiteSpace: "nowrap",
      }}
    >
      {mac ? "⌘K" : "Ctrl K"}
    </Box>
  );
}
