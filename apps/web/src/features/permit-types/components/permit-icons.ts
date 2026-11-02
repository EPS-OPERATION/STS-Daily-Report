import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { ComponentType } from "react";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import FlashOnOutlinedIcon from "@mui/icons-material/FlashOnOutlined";
import LocalFireDepartmentOutlinedIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import MeetingRoomOutlinedIcon from "@mui/icons-material/MeetingRoomOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import StairsOutlinedIcon from "@mui/icons-material/StairsOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

export const PERMIT_ICON_MAP: Record<string, ComponentType<SvgIconProps>> = {
  hot_work: LocalFireDepartmentOutlinedIcon,
  height: StairsOutlinedIcon,
  lifting: PrecisionManufacturingOutlinedIcon,
  loto: LockOutlinedIcon,
  confined_space: MeetingRoomOutlinedIcon,
  live_electrical: FlashOnOutlinedIcon,
  other: WarningAmberOutlinedIcon,
  tools: BuildOutlinedIcon,
  construction: ConstructionOutlinedIcon,
  engineering: EngineeringOutlinedIcon,
  chemical: ScienceOutlinedIcon,
  document: AssignmentOutlinedIcon,
};

export const PERMIT_ICON_OPTIONS = [
  { key: "hot_work", label: "Hot Work / ไฟ", icon: LocalFireDepartmentOutlinedIcon },
  { key: "height", label: "ที่สูง / บันได", icon: StairsOutlinedIcon },
  { key: "lifting", label: "งานยก / เครน", icon: PrecisionManufacturingOutlinedIcon },
  { key: "loto", label: "LOTO / ล็อก", icon: LockOutlinedIcon },
  { key: "confined_space", label: "ที่อับอากาศ", icon: MeetingRoomOutlinedIcon },
  { key: "live_electrical", label: "ไฟฟ้ามีกระแส", icon: FlashOnOutlinedIcon },
  { key: "tools", label: "เครื่องมือ / ช่าง", icon: BuildOutlinedIcon },
  { key: "construction", label: "ก่อสร้าง / งานดิน", icon: ConstructionOutlinedIcon },
  { key: "chemical", label: "สารเคมี", icon: ScienceOutlinedIcon },
  { key: "document", label: "เอกสารทั่วไป", icon: AssignmentOutlinedIcon },
  { key: "other", label: "อื่นๆ / คำเตือน", icon: WarningAmberOutlinedIcon },
];

export function getPermitIcon(key?: string): ComponentType<SvgIconProps> {
  if (key && PERMIT_ICON_MAP[key]) {
    return PERMIT_ICON_MAP[key];
  }
  return WarningAmberOutlinedIcon;
}
