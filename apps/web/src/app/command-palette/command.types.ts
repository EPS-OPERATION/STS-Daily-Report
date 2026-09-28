import type { SvgIconProps } from "@mui/material/SvgIcon";
import type { ComponentType } from "react";

export type CommandGroup =
  | "recent"
  | "navigate"
  | "actions"
  | "contractors"
  | "zones";

export const GROUP_LABELS: Record<CommandGroup, string> = {
  recent: "Recent",
  navigate: "Navigate",
  actions: "Actions",
  contractors: "Contractors",
  zones: "Zones",
};

export interface Command {
  id: string;
  label: string;
  description?: string;
  group: CommandGroup;
  keywords?: string[];
  icon?: ComponentType<SvgIconProps>;
  shortcut?: string;
  // Future permission filtering (roles/permissions land with auth).
  // Never rely on hiding alone — backend authorization still required.
  roles?: string[];
  action: () => void;
}

export interface GroupedCommands {
  group: CommandGroup;
  items: Command[];
}
