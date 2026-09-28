import type { NavigateFunction } from "react-router-dom";
import { navigationIcons } from "@/app/icons/navigation-icons.js";
import { CONTRACTOR_OPTIONS, ZONES } from "@/mock/site-data.js";
import type { Command } from "./command.types.js";

interface NavDef {
  id: string;
  label: string;
  to: string;
  iconKey: keyof typeof navigationIcons;
  description: string;
  keywords: string[];
}

const NAV: NavDef[] = [
  { id: "nav-dashboard", label: "Dashboard", to: "/", iconKey: "dashboard", description: "Project overview and KPIs", keywords: ["home", "overview", "kpi"] },
  { id: "nav-daily-reports", label: "Daily Reports", to: "/daily-reports", iconKey: "dailyReports", description: "View and manage daily reports", keywords: ["report", "list"] },
  { id: "nav-site-plan", label: "Site Plan", to: "/site-plan", iconKey: "sitePlan", description: "View WBS zones and activities", keywords: ["map", "zone", "wbs", "site"] },
  { id: "nav-tomorrow", label: "Tomorrow Plan", to: "/tomorrow", iconKey: "tomorrow", description: "Operational timeline for tomorrow", keywords: ["plan", "schedule", "next"] },
  { id: "nav-contractors", label: "Contractors", to: "/contractors", iconKey: "contractors", description: "Contractor registry", keywords: ["abc", "contractor", "company"] },
  { id: "nav-manpower", label: "Manpower", to: "/manpower", iconKey: "manpower", description: "Workforce headcount", keywords: ["worker", "people", "labour", "labor"] },
  { id: "nav-work-permits", label: "Work Permits", to: "/work-permits", iconKey: "workPermits", description: "High-risk work permits", keywords: ["permit", "hot work", "height"] },
  { id: "nav-qaqc", label: "QAQC", to: "/qaqc", iconKey: "qaqc", description: "Inspections and RFI status", keywords: ["inspection", "quality", "rfi"] },
  { id: "nav-materials", label: "Materials", to: "/materials", iconKey: "materials", description: "Deliveries and suppliers", keywords: ["material", "delivery", "supplier"] },
  { id: "nav-drone", label: "Drone Progress", to: "/progress", iconKey: "drone", description: "Periodic capture vs plan", keywords: ["drone", "photo", "progress", "survey"] },
  { id: "nav-projects", label: "Projects", to: "/projects", iconKey: "projects", description: "Project registry", keywords: ["project", "wbs"] },
  { id: "nav-settings", label: "Settings", to: "/settings", iconKey: "settings", description: "Project configuration", keywords: ["setting", "config", "admin"] },
];

const ACTIONS: Omit<NavDef, "iconKey">[] = [
  { id: "act-new-report", label: "Create Daily Report", to: "/evening-report", description: "Open the evening report wizard", keywords: ["new", "create", "report", "evening"] },
  { id: "act-add-contractor", label: "Add Contractor", to: "/contractors", description: "Open the contractor registry", keywords: ["new", "create", "add", "contractor"] },
  { id: "act-tomorrow-plan", label: "Create Tomorrow Plan", to: "/tomorrow", description: "Review tomorrow activities", keywords: ["new", "create", "plan", "tomorrow"] },
  { id: "act-upload-photo", label: "Upload Site Photo", to: "/field", description: "Contractor quick photo upload", keywords: ["upload", "photo", "camera", "picture"] },
];

// Static command set. Entity entries come from local mock data today;
// later this is where an async source (debounced TanStack Query against
// GET /api/v1/search) merges server results without changing the UI.
export function buildCommands(navigate: NavigateFunction): Command[] {
  const go = (to: string) => () => navigate(to);
  const navigateCmds: Command[] = NAV.map((n) => ({
    id: n.id,
    label: `Open ${n.label}`,
    description: n.description,
    group: "navigate",
    keywords: [n.label.toLowerCase(), ...n.keywords],
    icon: navigationIcons[n.iconKey],
    action: go(n.to),
  }));

  const actionCmds: Command[] = ACTIONS.map((a) => ({
    id: a.id,
    label: a.label,
    description: a.description,
    group: "actions",
    keywords: a.keywords,
    icon: navigationIcons.dailyReports,
    action: go(a.to),
  }));

  const contractorCmds: Command[] = CONTRACTOR_OPTIONS.map((name) => ({
    id: `contractor-${name}`,
    label: name,
    description: "Contractor · STS Project",
    group: "contractors",
    keywords: [name.toLowerCase(), "contractor", "company", "abc"],
    icon: navigationIcons.contractors,
    action: go("/contractors"),
  }));

  const zoneCmds: Command[] = ZONES.map((z) => ({
    id: `zone-${z.id}`,
    label: `Zone ${z.no} — ${z.name}`,
    description: `${z.today.length} activities today · STS Project`,
    group: "zones",
    keywords: [`zone ${z.no}`, z.name.toLowerCase(), z.short.toLowerCase(), "zone", "wbs", "map"],
    icon: navigationIcons.sitePlan,
    action: go("/site-plan"),
  }));

  return [...navigateCmds, ...actionCmds, ...contractorCmds, ...zoneCmds];
}

export function matchCommands(commands: Command[], query: string): Command[] {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return commands;
  return commands.filter((c) => {
    const hay = `${c.label} ${c.description ?? ""} ${(c.keywords ?? []).join(" ")}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });
}
