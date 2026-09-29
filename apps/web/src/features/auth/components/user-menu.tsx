import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useLogout } from "../hooks/use-logout.js";
import { useMe } from "../hooks/use-me.js";

function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts[1]?.[0] ?? "";
  return `${first}${second}`.toUpperCase();
}

export function UserMenu() {
  const me = useMe();
  const logout = useLogout();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const user = me.data?.data.user;
  const contractors = me.data?.data.contractors ?? [];
  const label = user?.displayName?.trim() || user?.email || "…";

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center">
        <IconButton
          aria-label="Account menu"
          aria-haspopup="menu"
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ p: 0 }}
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: 13 }}>
            {user ? initials(user.displayName, user.email) : "…"}
          </Avatar>
        </IconButton>
        <Box sx={{ display: { xs: "none", lg: "block" }, lineHeight: 1.2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {contractors.length > 0
              ? `${contractors.length} contractor${contractors.length === 1 ? "" : "s"}`
              : "STS Platform"}
          </Typography>
        </Box>
      </Stack>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
          {user ? (
            <Typography variant="caption" color="text.secondary">
              {user.email}
            </Typography>
          ) : null}
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            logout.mutate();
          }}
          disabled={logout.isPending}
        >
          <LogoutOutlinedIcon fontSize="small" style={{ marginRight: 8 }} />
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
}
