import ChevronLeftOutlinedIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import { useState } from "react";
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
}

interface NavGroup {
  title: string;
  items: NavItem[];
  roles: ("contractor" | "eps")[];
}

const GROUPS: NavGroup[] = [
  {
    title: "Overview",
    roles: ["eps"],
    items: [{ to: "/", label: "Dashboard", icon: "dashboard" }],
  },
  {
    title: "Daily Operations",
    roles: ["eps"],
    items: [
      { to: "/daily-reports", label: "Daily Reports", icon: "dailyReports" },
      { to: "/today-requests", label: "Daily Request", icon: "tomorrow" },
      { to: "/site-plan", label: "Site Plan", icon: "sitePlan" },
    ],
  },
  {
    title: "Project Control",
    roles: ["eps"],
    items: [
      { to: "/contractors", label: "Contractors", icon: "contractors" },
      { to: "/manpower", label: "Manpower", icon: "manpower" },
      { to: "/work-permits", label: "Work Permits", icon: "workPermits" },
      { to: "/qaqc", label: "QAQC", icon: "qaqc" },
      { to: "/materials", label: "Materials", icon: "materials" },
    ],
  },
  {
    title: "Progress",
    roles: ["eps"],
    items: [
      { to: "/progress", label: "Drone Progress", icon: "drone" },
      { to: "/reports", label: "Reports", icon: "reports" },
    ],
  },
  {
    title: "Field App",
    roles: ["contractor"],
    items: [
      { to: "/field", label: "Contractor Home", icon: "field" },
      { to: "/field/report", label: "Contractor Daily Report", icon: "dailyReports" },
    ],
  },
  {
    title: "Administration",
    roles: ["eps"],
    items: [
      { to: "/projects", label: "Projects", icon: "projects" },
      { to: "/site-plan/config", label: "Zone Config", icon: "zoneConfig" },
      { to: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

function SidebarContent({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const me = useMe();
  const role = me.data?.data.user.role ?? "contractor";
  const isContractor = role === "contractor";
  const visibleGroups = GROUPS.filter((g) => g.roles.includes(role));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "navy.dark", color: "#FFFFFF" }}>
      <Box sx={{ px: 2.5, py: 2.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: "#FFFFFF",
              color: "navy.dark",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            STS
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, display: collapsed ? "none" : "block" }}>
              STS Platform
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: isContractor ? "#60A5FA" : "#9DB4CC", fontWeight: isContractor ? 600 : 400, display: collapsed ? "none" : "block" }}
            >
              {isContractor ? "Contractor Field" : "Construction Operations"}
            </Typography>
          </Box>
        </Stack>
      </Box>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
      <Box className="sts-navy-scroll" sx={{ flexGrow: 1, overflowY: "auto", px: 1.5, py: 1 }}>
        {visibleGroups.map((group) => (
          <Box key={group.title} sx={{ mb: 1.5 }}>
            {!collapsed && (
              <Typography
                variant="caption"
                sx={{ px: 1.5, color: "#7E96B3", textTransform: "uppercase", letterSpacing: 0.8, fontSize: 11 }}
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
                      color: "#C6D5E5",
                      position: "relative",
                      justifyContent: collapsed ? "center" : "flex-start",
                      "&.active": {
                        bgcolor: "rgba(39,135,255,0.22)",
                        color: "#FFFFFF",
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
                      "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
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
      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
      <Box sx={{ p: collapsed ? 1.5 : 2 }}>
        <Box sx={{ borderRadius: 2, bgcolor: "rgba(255,255,255,0.06)", p: 1.5, textAlign: "center" }}>
          <Typography variant="body2" sx={{ fontWeight: 600, display: collapsed ? "none" : "block" }}>
            {isContractor ? (me.data?.data.contractors[0]?.name ?? "Contractor Field") : "Biomass Power Plant"}
          </Typography>
          <Typography variant="caption" sx={{ color: "#9DB4CC", display: collapsed ? "none" : "block" }}>
            {isContractor ? "STS Daily Field" : "STS Project"}
          </Typography>
          {collapsed && (
            <Typography variant="caption" sx={{ color: "#FFFFFF", fontWeight: 700 }}>
              {isContractor ? "FIELD" : "STS"}
            </Typography>
          )}
        </Box>
      </Box>

    </Box>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { projectId, setProjectId, projects, loading: projectsLoading } = useCurrentProject();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const desktop = useMediaQuery("(min-width:900px)");

  useCommandPaletteShortcut(paletteOpen, setPaletteOpen);

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
            <FormControl size="small" sx={{ minWidth: { xs: 150, sm: 230 } }}>
              <Select
                value={projectId ?? ""}
                onChange={(e) => setProjectId(e.target.value)}
                aria-label="Select project"
                disabled={projectsLoading || projects.length === 0}
                displayEmpty
                sx={{ fontWeight: 600 }}
              >
                {projectsLoading && (
                  <MenuItem value="" disabled>
                    Loading projects…
                  </MenuItem>
                )}
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              onClick={() => setPaletteOpen(true)}
              startIcon={<SearchOutlinedIcon fontSize="small" />}
              endIcon={<PaletteShortcutHint />}
              sx={{
                width: 240,
                height: 40,
                justifyContent: "flex-start",
                gap: 1,
                fontWeight: 400,
                fontSize: 13,
                whiteSpace: "nowrap",
                color: "text.secondary",
                borderColor: "divider",
                display: { xs: "none", sm: "inline-flex" },
                textTransform: "none",
              }}
            >
              Search anything…
            </Button>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton aria-label="Notifications">
              <Badge color="error" variant="dot">
                <NotificationsNoneOutlinedIcon />
              </Badge>
            </IconButton>
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
