import AgricultureOutlinedIcon from "@mui/icons-material/AgricultureOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { ComponentType } from "react";
import type { DailySiteMarkerIconKey } from "@sts/shared";

export const dailySiteMarkerIcons: Record<
  DailySiteMarkerIconKey,
  { label: string; Icon: ComponentType<SvgIconProps> }
> = {
  vehicle: { label: "Vehicle", Icon: DirectionsCarOutlinedIcon },
  truck: { label: "Truck", Icon: LocalShippingOutlinedIcon },
  crane: { label: "Crane", Icon: ConstructionOutlinedIcon },
  excavator: { label: "Excavator", Icon: AgricultureOutlinedIcon },
  equipment: { label: "Equipment", Icon: PrecisionManufacturingOutlinedIcon },
  material: { label: "Material", Icon: Inventory2OutlinedIcon },
  worker: { label: "Worker", Icon: EngineeringOutlinedIcon },
  hazard: { label: "Hazard", Icon: WarningAmberOutlinedIcon },
  "restricted-area": { label: "Restricted Area", Icon: BlockOutlinedIcon },
  "work-area": { label: "Work Area", Icon: ConstructionOutlinedIcon },
  other: { label: "Other", Icon: PlaceOutlinedIcon },
};
