import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { DailySiteMarkerIconKey } from "@sts/shared";
import { dailySiteMarkerIcons } from "./daily-site-marker-icons.js";

export function DailySiteMarkerIcon({ iconKey, ...props }: SvgIconProps & { iconKey: DailySiteMarkerIconKey }) {
  const Icon = dailySiteMarkerIcons[iconKey].Icon;
  return <Icon {...props} />;
}
