import Chip from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";

type Swatch = { bg: string; fg: string };

// Stable colour per contractor code, drawn from theme tokens only.
export function useContractorSwatch() {
  const theme = useTheme();
  const swatches: Swatch[] = [
    { bg: theme.palette.primary.light, fg: theme.palette.primary.dark },
    { bg: theme.palette.info.light, fg: theme.palette.info.dark },
    { bg: theme.palette.success.light, fg: theme.palette.success.dark },
    { bg: theme.palette.secondary.light, fg: theme.palette.secondary.dark },
    { bg: theme.palette.grey[200], fg: theme.palette.grey[800] },
  ];
  return (code: string): Swatch => {
    let h = 0;
    for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return swatches[h % swatches.length]!;
  };
}

export function ContractorBadge({ code, headcount, title }: { code: string; headcount?: number; title?: string }) {
  const swatch = useContractorSwatch()(code);
  return (
    <Chip
      size="small"
      title={title}
      label={headcount !== undefined ? `${code} ${headcount}` : code}
      sx={{
        height: 20,
        borderRadius: 1,
        bgcolor: swatch.bg,
        color: swatch.fg,
        fontWeight: 700,
        fontSize: 11,
        "& .MuiChip-label": { px: 0.75 },
      }}
    />
  );
}
