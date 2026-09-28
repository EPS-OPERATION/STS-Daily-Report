import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import type { ReactNode } from "react";

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 96;
  const h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 6)}`)
    .join(" ");
  return (
    <svg width={w} height={h} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

export interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  subTone?: "success" | "error" | "muted";
  spark: number[];
  sparkColor: string;
  icon: ReactNode;
  iconBg: string;
  iconFg: string;
}

export function KpiCard({ label, value, sub, subTone = "muted", spark, sparkColor, icon, iconBg, iconFg }: KpiCardProps) {
  const theme = useTheme();
  const subColor =
    subTone === "success"
      ? theme.palette.success.dark
      : subTone === "error"
        ? theme.palette.error.dark
        : theme.palette.text.secondary;
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start" justifyContent="space-between">
          <Stack spacing={1}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: iconBg,
                  color: iconFg,
                }}
              >
                {icon}
              </span>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.6 }}>
                {label}
              </Typography>
            </Stack>
            <Typography variant="metric">{value}</Typography>
            <Typography variant="body2" sx={{ color: subColor }}>
              {sub}
            </Typography>
          </Stack>
          <Sparkline data={spark} color={sparkColor} />
        </Stack>
      </CardContent>
    </Card>
  );
}
