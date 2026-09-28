import AccountTreeOutlined from "@mui/icons-material/AccountTreeOutlined";
import AssessmentOutlined from "@mui/icons-material/AssessmentOutlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import BusinessOutlined from "@mui/icons-material/BusinessOutlined";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import EngineeringOutlined from "@mui/icons-material/EngineeringOutlined";
import EventNoteOutlined from "@mui/icons-material/EventNoteOutlined";
import FactCheckOutlined from "@mui/icons-material/FactCheckOutlined";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import MapOutlined from "@mui/icons-material/MapOutlined";
import PhotoCameraOutlined from "@mui/icons-material/PhotoCameraOutlined";
import SettingsOutlined from "@mui/icons-material/SettingsOutlined";
import SmartphoneOutlined from "@mui/icons-material/SmartphoneOutlined";
import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { ComponentType } from "react";

// Central navigation icon mapping. One concept = one icon, always Outlined.
// Pages must reuse these entries instead of importing their own variant.
export type NavigationIcon = ComponentType<SvgIconProps>;

export const navigationIcons = {
  dashboard: DashboardOutlined,
  dailyReports: DescriptionOutlined,
  sitePlan: MapOutlined,
  tomorrow: EventNoteOutlined,
  contractors: BusinessOutlined,
  manpower: EngineeringOutlined,
  workPermits: AssignmentOutlined,
  qaqc: FactCheckOutlined,
  materials: Inventory2Outlined,
  drone: PhotoCameraOutlined,
  reports: AssessmentOutlined,
  field: SmartphoneOutlined,
  projects: AccountTreeOutlined,
  settings: SettingsOutlined,
} satisfies Record<string, NavigationIcon>;

export type NavigationIconKey = keyof typeof navigationIcons;
