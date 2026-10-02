import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import { Link as RouterLink } from "react-router-dom";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import type { ReactNode } from "react";

export interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  subTone?: "success" | "error" | "muted";
  trend?: "up" | "down";
  icon: ReactNode;
  iconBg: string;
  iconFg: string;
  /** Optional page link — the whole card becomes clickable. */
  to?: string;
}

// Enterprise KPI: label row, inline value+unit (never wraps), delta row.
// No decorative sparklines — every element carries information.
export function KpiCard({
  label,
  value,
  unit,
  sub,
  subTone = "muted",
  trend,
  icon,
  iconBg,
  iconFg,
  to,
}: KpiCardProps) {
  const theme = useTheme();
  const subColor =
    subTone === "success"
      ? theme.palette.success.dark
      : subTone === "error"
        ? theme.palette.error.dark
        : theme.palette.text.secondary;
  const TrendIcon = trend === "down" ? TrendingDownOutlinedIcon : TrendingUpOutlinedIcon;
  return (
    <Card sx={{ height: "100%" }}>
      <CardActionArea
        {...(to ? { component: RouterLink, to } : { disabled: true })}
        aria-label={to ? `${label} — open page` : undefined}
        sx={{ height: "100%", "&.Mui-disabled": { opacity: 1 } }}
      >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: iconBg,
              color: iconFg,
              flexShrink: 0,
            }}
          >
            {icon}
          </span>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap" }}
          >
            {label}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={0.75} alignItems="baseline" sx={{ mt: 1.5 }}>
          <Typography variant="metric" sx={{ whiteSpace: "nowrap" }}>
            {value}
          </Typography>
          {unit ? (
            <Typography variant="body1" color="text.secondary">
              {unit}
            </Typography>
          ) : null}
        </Stack>

        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5, minHeight: 20 }}>
          {trend ? <TrendIcon sx={{ fontSize: 14, color: subColor }} aria-hidden="true" /> : null}
          <Typography variant="body2" sx={{ color: subColor, whiteSpace: "nowrap" }}>
            {sub}
          </Typography>
        </Stack>
      </CardContent>
      </CardActionArea>
    </Card>
  );
}
