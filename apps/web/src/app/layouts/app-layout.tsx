import MenuOutlinedIcon from "@mui/icons-material/MenuOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
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
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { CommandPalette } from "@/app/command-palette/command-palette.js";
import { PaletteShortcutHint, useCommandPaletteShortcut } from "@/app/command-palette/shortcut-hint.js";
import { navigationIcons, type NavigationIconKey } from "@/app/icons/navigation-icons.js";

const DRAWER_WIDTH = 248;

interface NavItem {
  to: string;
  label: string;
  icon: NavigationIconKey;
}

const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: "dashboard" }],
  },
  {
    title: "Daily Operations",
    items: [
      { to: "/daily-reports", label: "Daily Reports", icon: "dailyReports" },
      { to: "/site-plan", label: "Site Plan", icon: "sitePlan" },
      { to: "/tomorrow", label: "Tomorrow Plan", icon: "tomorrow" },
    ],
  },
  {
    title: "Project Control",
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
    items: [
      { to: "/progress", label: "Drone Progress", icon: "drone" },
      { to: "/reports", label: "Reports", icon: "reports" },
    ],
  },
  {
    title: "Field App",
    items: [{ to: "/field", label: "Contractor Home", icon: "field" }],
  },
  {
    title: "Administration",
    items: [
      { to: "/projects", label: "Projects", icon: "projects" },
      { to: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
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
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              STS Platform
            </Typography>
            <Typography variant="caption" sx={{ color: "#9DB4CC" }}>
              Construction Operations
            </Typography>
          </Box>
        </Stack>
      </Box>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
      <Box className="sts-navy-scroll" sx={{ flexGrow: 1, overflowY: "auto", px: 1.5, py: 1 }}>
        {GROUPS.map((group) => (
          <Box key={group.title} sx={{ mb: 1.5 }}>
            <Typography
              variant="caption"
              sx={{ px: 1.5, color: "#7E96B3", textTransform: "uppercase", letterSpacing: 0.8, fontSize: 11 }}
            >
              {group.title}
            </Typography>
            <List dense disablePadding sx={{ mt: 0.5 }}>
              {group.items.map((item) => {
                  const Icon = navigationIcons[item.icon];
                  return (
                    <ListItemButton
                    key={item.to}
                    component={NavLink}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={onNavigate}
                    sx={{
                      borderRadius: 1.5,
                      mb: 0.25,
                      color: "#C6D5E5",
                      position: "relative",
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
                    <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
                      <Icon fontSize="small" aria-hidden="true" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
                    />
                    </ListItemButton>
                  );
                })}
            </List>
          </Box>
        ))}
      </Box>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
      <Box sx={{ p: 2 }}>
        <Box sx={{ borderRadius: 2, bgcolor: "rgba(255,255,255,0.06)", p: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Biomass Power Plant
          </Typography>
          <Typography variant="caption" sx={{ color: "#9DB4CC" }}>
            STS Project
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [project, setProject] = useState("biomass");
  const [paletteOpen, setPaletteOpen] = useState(false);

  useCommandPaletteShortcut(paletteOpen, setPaletteOpen);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, border: "none" },
        }}
      >
        <SidebarContent />
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
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              sx={{ display: { md: "none" } }}
            >
              <MenuOutlinedIcon />
            </IconButton>
            <FormControl size="small" sx={{ minWidth: { xs: 150, sm: 230 } }}>
              <Select
                value={project}
                onChange={(e) => setProject(e.target.value)}
                aria-label="Select project"
                sx={{ fontWeight: 600 }}
              >
                <MenuItem value="biomass">STS Biomass Power Plant</MenuItem>
                <MenuItem value="solar">STS Solar Farm Phase 2</MenuItem>
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
            <Chip label="28 Sep 2026" variant="outlined" sx={{ display: { xs: "none", sm: "flex" } }} />
            <IconButton aria-label="Notifications">
              <Badge color="error" variant="dot">
                <NotificationsNoneOutlinedIcon />
              </Badge>
            </IconButton>
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 13 }}>SP</Avatar>
              <Box sx={{ display: { xs: "none", lg: "block" }, lineHeight: 1.2 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Somchai P.
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Project Manager
                </Typography>
              </Box>
            </Stack>
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
