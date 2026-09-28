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

// "Ctrl K" on Windows/Linux, "⌘K" on macOS.
export function PaletteShortcutHint() {
  const [mac, setMac] = useState(false);
  useEffect(() => {
    setMac(isMacPlatform());
  }, []);
  return (
    <Box
      component="span"
      sx={{
        fontSize: 11,
        color: "text.disabled",
        whiteSpace: "nowrap",
      }}
    >
      {mac ? "⌘K" : "Ctrl K"}
    </Box>
  );
}
