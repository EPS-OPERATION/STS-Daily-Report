import ElectricBoltOutlined from "@mui/icons-material/ElectricBoltOutlined";
import LocalFireDepartmentOutlined from "@mui/icons-material/LocalFireDepartmentOutlined";
import LockOutlined from "@mui/icons-material/LockOutlined";
import PrecisionManufacturingOutlined from "@mui/icons-material/PrecisionManufacturingOutlined";
import SensorDoorOutlined from "@mui/icons-material/SensorDoorOutlined";
import StairsOutlined from "@mui/icons-material/StairsOutlined";
import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import { PERMIT_TYPES } from "@sts/shared";
import type { ComponentType } from "react";

export const PERMIT_ICONS: Record<string, ComponentType<SvgIconProps>> = {
  hot_work: LocalFireDepartmentOutlined,
  height: StairsOutlined,
  lifting: PrecisionManufacturingOutlined,
  loto: LockOutlined,
  confined_space: SensorDoorOutlined,
  live_electrical: ElectricBoltOutlined,
  other: WarningAmberOutlined,
};

export function getPermitIconComponent(type: string): ComponentType<SvgIconProps> {
  return PERMIT_ICONS[type] ?? WarningAmberOutlined;
}

export function permitLabel(type: string): string {
  return PERMIT_TYPES.find((p) => p.code === type)?.label ?? type;
}
