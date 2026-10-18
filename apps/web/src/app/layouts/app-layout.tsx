import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { alpha, useTheme } from "@mui/material/styles";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { UserRole } from "@sts/shared";
import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { CommandPalette } from "@/app/command-palette/command-palette.js";
import { PaletteShortcutHint, useCommandPaletteShortcut } from "@/app/command-palette/shortcut-hint.js";
import { UserMenu } from "@/features/auth/components/user-menu.js";
import { useCurrentProject } from "@/features/projects/context/project-context.js";
import { useMe } from "@/features/auth/hooks/use-me.js";
import { navigationIcons, type NavigationIconKey } from "@/app/icons/navigation-icons.js";

const DRAWER_WIDTH = 248;

interface NavItem {
  to: string;
  label: string;
  icon: NavigationIconKey;
  roles?: UserRole[];
}

interface NavGroup {
  title: string;
  items: NavItem[];
  roles: UserRole[];
}

const EPS_VIEWERS: UserRole[] = ["eps_site", "eps_admin"];

const GROUPS: NavGroup[] = [
  {
    title: "Overview",
    roles: EPS_VIEWERS,
    items: [{ to: "/", label: "Dashboard", icon: "dashboard" }],
  },
  {
    title: "Daily Operations",
    roles: EPS_VIEWERS,
    items: [
      { to: "/daily-reports", label: "Daily Reports", icon: "dailyReports" },
      { to: "/today-requests", label: "Daily Request", icon: "tomorrow" },
      { to: "/site-coordination", label: "Map", icon: "sitePlan" },
      { to: "/site-plan", label: "Site Plan (Option)", icon: "sitePlan", roles: ["eps_admin"] },
    ],
  },
  {
    title: "Project Control",
    roles: EPS_VIEWERS,
    items: [
      { to: "/manpower", label: "Manpower", icon: "manpower" },
      { to: "/qaqc", label: "QAQC", icon: "qaqc" },
      { to: "/safety", label: "Safety & Permits", icon: "safety" },
      { to: "/materials", label: "Materials (Option)", icon: "materials", roles: ["eps_admin"] },
    ],
  },
  {
    title: "Progress",
    roles: EPS_VIEWERS,
    items: [
      { to: "/progress", label: "Drone Progress", icon: "drone" },
    ],
  },
  {
    title: "Field App",
    roles: ["contractor"],
    items: [
      { to: "/field", label: "Contractor Home", icon: "field" },
      { to: "/field/report", label: "Contractor Daily Report", icon: "dailyReports" },
      { to: "/field/coordination", label: "Map", icon: "sitePlan" },
    ],
  },
  {
    title: "Administration",
    roles: EPS_VIEWERS,
    items: [
      // User management and contractor master data stay eps_admin-only.
      { to: "/admin/users", label: "Users", icon: "users", roles: ["eps_admin"] },
      { to: "/contractors", label: "Contractors", icon: "contractors", roles: ["eps_admin"] },
      { to: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

function SidebarContent({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const theme = useTheme();
  const me = useMe();
  const role = me.data?.data.user.role ?? "contractor";
  const isContractor = role === "contractor";
  const visibleGroups = GROUPS.filter((g) => g.roles.includes(role)).map((g) => ({
    ...g,
    items: g.items.filter((item) => !item.roles || item.roles.includes(role)),
  }));
  const { projectId, projects } = useCurrentProject();
  const project = projects.find((p) => p.id === projectId);
  const myContractor = me.data?.data.contractors[0];
  // Quiet context line: which project (EPS staff) or which company (contractor) this session reports for.
  const contextLabel = isContractor
    ? (myContractor ? `${myContractor.code} · ${myContractor.name}` : "ยังไม่ผูกผู้รับเหมา")
    : (project ? `${project.code} · ${project.name}` : "STS Project");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "navy.dark", color: "common.white" }}>
      <Box
        sx={{
          height: 64,
          display: "flex",
          alignItems: "center",
          px: collapsed ? 1.5 : 2.5,
          bgcolor: "common.white",
          borderBottom: "1px solid",
          borderColor: "divider",
          justifyContent: collapsed ? "center" : "flex-start",
        }}
      >
        <Box
          component={NavLink}
          to="/"
          onClick={onNavigate}
          aria-label="STS Platform — home"
          title="STS Platform — home"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
            transition: "opacity 0.15s",
            "&:hover": { opacity: 0.85 },
          }}
        >
          <Box
            component="img"
            src={collapsed ? "/brand/logo-eps-mark-white.png" : "/brand/logo-eps-white.png"}
            alt="EPS — STS Platform"
            sx={collapsed ? { width: 36, height: 36, display: "block" } : { height: 32, width: "auto", display: "block" }}
          />
        </Box>
      </Box>
      <Box className="sts-navy-scroll" sx={{ flexGrow: 1, overflowY: "auto", px: 1.5, py: 1 }}>
        {visibleGroups.map((group) => (
          <Box key={group.title} sx={{ mb: 1.5 }}>
            {!collapsed && (
              <Typography
                variant="caption"
                sx={{ px: 1.5, color: alpha(theme.palette.common.white, 0.5), textTransform: "uppercase", letterSpacing: 0.8, fontSize: 12 }}
              >
                {group.title}
              </Typography>
            )}

            <List dense disablePadding sx={{ mt: 0.5 }}>
              {group.items.map((item) => {
                  const Icon = navigationIcons[item.icon];
                  const button = (
                    <ListItemButton
                    key={item.to}
                    component={NavLink}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    sx={{
                      borderRadius: 1.5,
                      mb: 0.25,
                      color: alpha(theme.palette.common.white, 0.78),
                      position: "relative",
                      justifyContent: collapsed ? "center" : "flex-start",
                      "&.active": {
                        bgcolor: alpha(theme.palette.info.main, 0.22),
                        color: "common.white",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          left: -12,
                          top: 8,
                          bottom: 8,
                          width: 3,
                          borderRadius: 3,
                          bgcolor: "info.main",
                        },
                      },
                      "&:hover": { bgcolor: alpha(theme.palette.common.white, 0.08) },
                    }}
                  >
                    <ListItemIcon sx={{ color: "inherit", minWidth: collapsed ? 0 : 36 }}>
                      <Icon fontSize="small" aria-hidden="true" />
                    </ListItemIcon>
                    {!collapsed && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
                      />
                    )}
                    </ListItemButton>
                  );
                  return collapsed ? (
                    <Tooltip key={item.to} title={item.label} placement="right" arrow>
                      {button}
                    </Tooltip>
                  ) : (
                    button
                  );
                })}
            </List>
          </Box>
        ))}
      </Box>
      <Divider sx={{ borderColor: alpha(theme.palette.common.white, 0.12) }} />
      <Box sx={{ px: collapsed ? 1.5 : 2.5, py: 1.75 }}>
        {collapsed ? (
          <Tooltip title={contextLabel} placement="right" arrow>
            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "success.main", mx: "auto" }} />
          </Tooltip>
        ) : (
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "success.main", flexShrink: 0 }} />
            <Typography
              variant="body2"
              title={contextLabel}
              sx={{ color: alpha(theme.palette.common.white, 0.65), fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {contextLabel}
            </Typography>
          </Stack>
        )}
      </Box>

    </Box>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { projectId, setProjectId, projects, loading: projectsLoading } = useCurrentProject();
  const me = useMe();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const desktop = useMediaQuery("(min-width:900px)");

  // Show the project switcher only when there is an actual choice: contractors see the
  // projects they are linked to (memberships), EPS staff see all projects. One project → hidden.
  const role = me.data?.data.user.role ?? "contractor";
  const membershipProjectIds = new Set((me.data?.data.contractors ?? []).map((c) => c.projectId));
  const projectOptions = role === "contractor"
    ? projects.filter((p) => membershipProjectIds.has(p.id))
    : projects;
  const showProjectSelect = !projectsLoading && projectOptions.length > 1;

  useCommandPaletteShortcut(paletteOpen, setPaletteOpen);

  // The field bottom-nav "More" tab opens this drawer (mobile has no topbar toggle target left).
  useEffect(() => {
    const open = () => setMobileOpen(true);
    window.addEventListener("sts:open-nav", open);
    return () => window.removeEventListener("sts:open-nav", open);
  }, []);

  const sidebarWidth = collapsed ? 76 : DRAWER_WIDTH;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: sidebarWidth,
          flexShrink: 0,
          display: { xs: "none", md: "block" },
          transition: (t) => t.transitions.create("width", { duration: t.transitions.duration.shorter }),
          "& .MuiDrawer-paper": {
            width: sidebarWidth,
            border: "none",
            overflowX: "hidden",
            transition: (t) => t.transitions.create("width", { duration: t.transitions.duration.shorter }),
          },
        }}
      >
        <SidebarContent collapsed={collapsed} />
      </Drawer>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, border: "none" },
        }}
      >
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Topbar */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: (t) => t.zIndex.drawer - 1,
            bgcolor: "background.paper",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Toolbar sx={{ gap: 2, minHeight: 64 }}>
            <IconButton
              edge="start"
              onClick={() => (desktop ? setCollapsed((v) => !v) : setMobileOpen(true))}
              aria-label={desktop ? (collapsed ? "Expand sidebar" : "Collapse sidebar") : "Open navigation"}
            >
              {desktop ? (
                collapsed ? (
                  <ChevronRightOutlinedIcon />
                ) : (
                  <ChevronLeftOutlinedIcon />
                )
              ) : (
                <MenuOutlinedIcon />
              )}
            </IconButton>
            {showProjectSelect ? (
              <FormControl size="small" sx={{ minWidth: { xs: 150, sm: 230 } }}>
                <Select
                  value={projectId ?? ""}
                  onChange={(e) => setProjectId(e.target.value)}
                  aria-label="Select project"
                  disabled={projectsLoading || projectOptions.length === 0}
                  displayEmpty
                  sx={{ fontWeight: 600 }}
                >
                  {projectOptions.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : null}
            <Button
              onClick={() => setPaletteOpen(true)}
              aria-keyshortcuts="Control+K Meta+K"
              sx={{
                width: 240,
                height: 40,
                px: 1.5,
                justifyContent: "flex-start",
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                color: "text.disabled",
                fontSize: 14,
                fontWeight: 400,
                textTransform: "none",
                whiteSpace: "nowrap",
                display: { xs: "none", sm: "inline-flex" },
                "&:hover": { bgcolor: "grey.50", borderColor: "grey.400" },
              }}
            >
              <SearchOutlinedIcon sx={{ fontSize: 19, mr: 1 }} />
              <Box component="span" sx={{ flexGrow: 1, textAlign: "left" }}>
                Search anything…
              </Box>
              <PaletteShortcutHint />
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <UserMenu />
          </Toolbar>
        </Box>

        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, pb: { xs: 10, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </Box>
  );
}
