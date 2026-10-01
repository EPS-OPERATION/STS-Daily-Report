import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMe } from "@/features/auth/hooks/use-me.js";
import { buildCommands } from "./command-registry.js";
import { useCommandPalette } from "./use-command-palette.js";

function ShortcutHint({ label }: { label: string }) {
  return (
    <Box
      component="span"
      sx={{
        fontSize: 11,
        color: "text.secondary",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        px: 0.75,
        py: 0.25,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  );
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const me = useMe();
  const role = me.data?.data.user.role ?? "contractor";
  const commands = useMemo(() => buildCommands(navigate, role), [navigate, role]);
  const { query, setQuery, groups, groupLabel, activeIndex, activeCommand, setActive, move, execute, flat } =
    useCommandPalette(commands);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 3, maxHeight: "70vh" } }}
      aria-labelledby="cmd-palette-title"
    >
      <DialogTitle id="cmd-palette-title" sx={{ display: "none" }}>
        Command palette
      </DialogTitle>
      <Box sx={{ p: 1.5, pb: 0 }}>
        <TextField
          autoFocus
          fullWidth
          label="Search commands, contractors, zones"
          placeholder="Search anything…"
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
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlinedIcon fontSize="small" color="disabled" />
              </InputAdornment>
            ),
          }}
        />
      </Box>
      <Box sx={{ overflowY: "auto", p: 1.5, pt: 1 }} role="listbox" aria-label="Commands">
        {flat.length === 0 ? (
          <Box sx={{ px: 1.5, py: 3, textAlign: "center" }}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              No results found
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Try another search term
            </Typography>
          </Box>
        ) : (
          groups.map((g, gi) => (
            <Box key={g.group} sx={{ mb: gi === groups.length - 1 ? 0 : 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ px: 1.5, textTransform: "uppercase", letterSpacing: 0.8, fontSize: 11 }}
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
                        borderRadius: 1.5,
                        "&.Mui-selected": { bgcolor: "primary.light" },
                      }}
                    >
                      {Icon ? (
                        <ListItemIcon sx={{ minWidth: 36, color: "text.secondary" }}>
                          <Icon fontSize="small" aria-hidden="true" />
                        </ListItemIcon>
                      ) : null}
                      <ListItemText
                        primary={cmd.label}
                        secondary={cmd.description}
                        primaryTypographyProps={{ fontSize: 14, fontWeight: selected ? 600 : 500 }}
                        secondaryTypographyProps={{ fontSize: 12 }}
                      />
                      {selected ? <ShortcutHint label="Enter" /> : null}
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          ))
        )}
        <Box sx={{ px: 1.5, pt: 1, display: "flex", gap: 2 }}>
          <Typography variant="caption" color="text.secondary">
            ↑↓ navigate
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Enter select
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Esc close
          </Typography>
        </Box>
      </Box>
    </Dialog>
  );
}
