import type { UserRole } from "@sts/shared";
import type { NavigateFunction } from "react-router-dom";
import { navigationIcons } from "@/app/icons/navigation-icons.js";
import type { Command } from "./command.types.js";

// Real entities from the API (project contractors + WBS zones), passed in by the palette.
export interface PaletteEntities {
  contractors: { code: string; name: string }[];
  zones: { code: string; name: string }[];
}

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
  { id: "nav-site-coordination", label: "Map (ผังประสานงาน)", to: "/site-coordination", iconKey: "sitePlan", description: "Interactive site coordination map & callouts", keywords: ["map", "coordination", "callout", "pin", "topdown"] },
  { id: "nav-site-plan", label: "Site Plan (Option)", to: "/site-plan", iconKey: "sitePlan", description: "View WBS zones and activities", keywords: ["map", "zone", "wbs", "site"] },
  { id: "nav-today-requests", label: "Daily Request", to: "/today-requests", iconKey: "tomorrow", description: "Daily requests for inspections, machinery, and permits", keywords: ["request", "today", "plan", "permit", "inspection"] },
  { id: "nav-contractors", label: "Contractors", to: "/contractors", iconKey: "contractors", description: "Contractor registry", keywords: ["abc", "contractor", "company"] },
  { id: "nav-manpower", label: "Manpower", to: "/manpower", iconKey: "manpower", description: "Workforce headcount", keywords: ["worker", "people", "labour", "labor"] },
  { id: "nav-work-permits", label: "Work Permits", to: "/safety?tab=permits", iconKey: "workPermits", description: "High-risk work permits", keywords: ["permit", "hot work", "height"] },
  { id: "nav-safety", label: "Safety & Permits", to: "/safety", iconKey: "safety", description: "Safety line walk, incidents and summary", keywords: ["safety", "accident", "line walk", "unsafe", "ปลอดภัย"] },
  { id: "nav-qaqc", label: "QAQC", to: "/qaqc", iconKey: "qaqc", description: "Inspections and RFI status", keywords: ["inspection", "quality", "rfi"] },
  { id: "nav-materials", label: "Materials (Option)", to: "/materials", iconKey: "materials", description: "Deliveries and suppliers", keywords: ["material", "delivery", "supplier"] },
  { id: "nav-drone", label: "Drone Progress", to: "/progress", iconKey: "drone", description: "Periodic capture vs plan", keywords: ["drone", "photo", "progress", "survey"] },
  { id: "nav-settings", label: "Settings", to: "/settings", iconKey: "settings", description: "Project configuration", keywords: ["setting", "config", "admin"] },
  { id: "nav-users", label: "Users", to: "/admin/users", iconKey: "users", description: "Review registrations and reset passwords", keywords: ["user", "account", "approval", "admin"] },
];

const ACTIONS: Omit<NavDef, "iconKey">[] = [
  { id: "act-new-report", label: "Create Daily Report", to: "/field/report", description: "Contractor morning check-in / evening check-out", keywords: ["new", "create", "report", "morning", "evening", "allocation"] },
  { id: "act-add-contractor", label: "Add Contractor", to: "/contractors", description: "Open the contractor registry", keywords: ["new", "create", "add", "contractor"] },
  { id: "act-today-requests", label: "View Daily Request", to: "/today-requests", description: "Daily requests registry", keywords: ["request", "today", "daily"] },
  { id: "act-upload-photo", label: "Upload Site Photo", to: "/field", description: "Contractor quick photo upload", keywords: ["upload", "photo", "camera", "picture"] },
];

// Static command set + entity entries (contractors, zones) from the API.
export function buildCommands(
  navigate: NavigateFunction,
  role: UserRole = "contractor",
  entities?: PaletteEntities,
): Command[] {
  const go = (to: string) => () => navigate(to);
  // eps_site has no user/contractor administration: drop those destinations from the palette.
  const isAdmin = role === "eps_admin";
  const adminOnly = new Set(["nav-contractors", "nav-users", "nav-site-plan", "nav-materials"]);

  if (role === "contractor") {
    return [
      {
        id: "nav-contractor-home",
        label: "Open Contractor Home",
        description: "Contractor dashboard & daily tasks",
        group: "navigate",
        keywords: ["home", "contractor", "field", "today"],
        icon: navigationIcons.field,
        action: go("/field"),
      },
      {
        id: "nav-field-report",
        label: "Open Contractor Daily Report",
        description: "Submit morning check-in and evening check-out",
        group: "navigate",
        keywords: ["report", "daily", "morning", "evening", "check-in", "check-out"],
        icon: navigationIcons.dailyReports,
        action: go("/field/report"),
      },
      {
        id: "nav-field-coordination",
        label: "Map",
        description: "Collaborative top-view site map for contractors",
        group: "navigate",
        keywords: ["map", "coordination", "field", "machine", "crane", "ผัง"],
        icon: navigationIcons.sitePlan,
        action: go("/field/coordination"),
      },
      {
        id: "act-new-report",
        label: "Fill Daily Report",
        description: "Contractor morning check-in / evening check-out",
        group: "actions",
        keywords: ["new", "create", "report", "morning", "evening", "allocation"],
        icon: navigationIcons.dailyReports,
        action: go("/field/report"),
      },
      {
        id: "act-upload-photo",
        label: "Upload Site Photo",
        description: "Contractor quick photo upload",
        group: "actions",
        keywords: ["upload", "photo", "camera", "picture"],
        icon: navigationIcons.drone,
        action: go("/field"),
      },
    ];
  }

  const navigateCmds: Command[] = (isAdmin ? NAV : NAV.filter((n) => !adminOnly.has(n.id))).map((n) => ({
    id: n.id,
    label: `Open ${n.label}`,
    description: n.description,
    group: "navigate",
    keywords: [n.label.toLowerCase(), ...n.keywords],
    icon: navigationIcons[n.iconKey],
    action: go(n.to),
  }));

  // /field* and the site-plan zones are contractor/admin-only routes; EPS site users
  // must never get a command that silently redirects them away.
  const contractorOnlyActions = new Set(["act-new-report", "act-upload-photo"]);
  const actionCmds: Command[] = ACTIONS.filter((a) => !contractorOnlyActions.has(a.id) && (isAdmin || a.id !== "act-add-contractor")).map((a) => ({
    id: a.id,
    label: a.label,
    description: a.description,
    group: "actions",
    keywords: a.keywords,
    icon: navigationIcons.dailyReports,
    action: go(a.to),
  }));

  const contractorCmds: Command[] = isAdmin ? (entities?.contractors ?? []).map((c) => ({
    id: `contractor-${c.code}`,
    label: `${c.code} · ${c.name}`,
    description: "Contractor",
    group: "contractors",
    keywords: [c.code.toLowerCase(), c.name.toLowerCase(), "contractor", "company"],
    icon: navigationIcons.contractors,
    action: go("/contractors"),
  })) : [];

  const zoneCmds: Command[] = isAdmin ? (entities?.zones ?? []).map((z) => ({
    id: `zone-${z.code}`,
    label: `Zone ${z.code}${z.name ? ` — ${z.name}` : ""}`,
    description: "WBS zone",
    group: "zones",
    keywords: [`zone ${z.code}`, z.name.toLowerCase(), "zone", "wbs", "map"],
    icon: navigationIcons.sitePlan,
    action: go("/site-plan"),
  })) : [];

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
