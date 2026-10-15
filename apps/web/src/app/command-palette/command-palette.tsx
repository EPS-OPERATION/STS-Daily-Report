import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import InputBase from "@mui/material/InputBase";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMe } from "@/features/auth/hooks/use-me.js";
import { useCurrentProject, useProjectContractors } from "@/features/projects/index.js";
import { usePlanZones } from "@/features/site-plan/index.js";
import { buildCommands } from "./command-registry.js";
import { useCommandPalette } from "./use-command-palette.js";

function Kbd({ children }: { children: string }) {
  return (
    <Box
      component="kbd"
      sx={{
        fontFamily: "inherit",
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.6,
        color: "text.secondary",
        bgcolor: "grey.100",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 0.75,
        px: 0.75,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Box>
  );
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const me = useMe();
  const role = me.data?.data.user.role ?? "contractor";
  const { projectId } = useCurrentProject();
  const contractors = useProjectContractors(projectId).data?.data ?? [];
  const zones = usePlanZones(projectId).data?.data ?? [];
  const entities = useMemo(
    () => ({
      contractors: contractors.map((c) => ({ code: c.code, name: c.name })),
      zones: zones.map((z) => ({ code: z.code, name: z.name })),
    }),
    [contractors, zones],
  );
  const commands = useMemo(() => buildCommands(navigate, role, entities), [navigate, role, entities]);
  const { query, setQuery, groups, groupLabel, activeIndex, activeCommand, setActive, move, execute, flat } =
    useCommandPalette(commands);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: { display: "flex", flexDirection: "column", maxHeight: "70vh", borderRadius: 1.5, overflow: "hidden" },
      }}
      aria-labelledby="cmd-palette-title"
    >
      <DialogTitle id="cmd-palette-title" sx={{ display: "none" }}>
        Command palette
      </DialogTitle>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 2, py: 1.5 }}>
        <SearchOutlinedIcon sx={{ fontSize: 20, color: "text.disabled" }} aria-hidden="true" />
        <InputBase
          autoFocus
          fullWidth
          placeholder="Search commands, contractors, zones…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              move(1);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              move(-1);
            } else if (e.key === "Enter" && activeCommand) {
              e.preventDefault();
              execute(activeCommand);
              onClose();
            }
          }}
          inputProps={{
            "aria-label": "Search commands",
            "aria-activedescendant": activeCommand ? `cmd-option-${activeCommand.id}` : undefined,
          }}
          sx={{ fontSize: 15 }}
        />
      </Box>
      <Divider />
      <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: "auto", p: 1 }} role="listbox" aria-label="Commands">
        {flat.length === 0 ? (
          <Box sx={{ px: 2, py: 4, textAlign: "center" }}>
            <SearchOffOutlinedIcon sx={{ fontSize: 32, color: "text.disabled", mb: 1 }} aria-hidden="true" />
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
              No matches{query.trim() ? ` for “${query.trim()}”` : ""}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Try another search term
            </Typography>
          </Box>
        ) : (
          groups.map((g, gi) => (
            <Box key={g.group} sx={{ mb: gi === groups.length - 1 ? 0 : 0.5 }}>
              <Typography
                variant="caption"
                sx={{ display: "block", px: 1.5, py: 0.5, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.8, fontSize: 11, fontWeight: 600 }}
              >
                {groupLabel(g.group)}
              </Typography>
              <List dense disablePadding>
                {g.items.map((cmd) => {
                  const index = flat.findIndex((c) => c.id === cmd.id);
                  const selected = index === activeIndex;
                  const Icon = cmd.icon;
                  return (
                    <ListItemButton
                      key={cmd.id}
                      id={`cmd-option-${cmd.id}`}
                      role="option"
                      aria-selected={selected}
                      selected={selected}
                      onClick={() => {
                        execute(cmd);
                        onClose();
                      }}
                      onMouseEnter={() => {
                        if (!selected) setActive(cmd.id);
                      }}
                      sx={{
                        borderRadius: 1,
                        position: "relative",
                        "&.Mui-selected": { bgcolor: "primary.light" },
                        "&.Mui-selected:hover": { bgcolor: "primary.light" },
                        // Same active accent as the sidebar navigation items.
                        "&.Mui-selected::before": {
                          content: '""',
                          position: "absolute",
                          left: 4,
                          top: 8,
                          bottom: 8,
                          width: 3,
                          borderRadius: 1.5,
                          bgcolor: "info.main",
                        },
                      }}
                    >
                      {Icon ? (
                        <ListItemIcon sx={{ minWidth: 36, color: selected ? "info.main" : "text.secondary" }}>
                          <Icon fontSize="small" aria-hidden="true" />
                        </ListItemIcon>
                      ) : null}
                      <ListItemText
                        primary={cmd.label}
                        secondary={cmd.description}
                        primaryTypographyProps={{ fontSize: 14, fontWeight: selected ? 600 : 500 }}
                        secondaryTypographyProps={{ fontSize: 13 }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          ))
        )}
      </Box>
      <Divider />
      <Box sx={{ display: "flex", alignItems: "center", gap: 2.5, px: 2, py: 1, bgcolor: "grey.50" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Kbd>↑↓</Kbd>
          <Typography variant="caption" color="text.secondary">navigate</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Kbd>Enter</Kbd>
          <Typography variant="caption" color="text.secondary">open</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Kbd>Esc</Kbd>
          <Typography variant="caption" color="text.secondary">close</Typography>
        </Box>
      </Box>
    </Dialog>
  );
}
