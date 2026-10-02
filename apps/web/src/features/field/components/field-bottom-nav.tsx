import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import EventNoteOutlinedIcon from "@mui/icons-material/EventNoteOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import Paper from "@mui/material/Paper";
import { useLocation, useNavigate } from "react-router-dom";

// Mobile-only bottom nav for field flows. Hidden on md+ (sidebar covers nav).
export function FieldBottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const value = pathname.startsWith("/evening-report") ? 1 : pathname.startsWith("/tomorrow") ? 2 : 0;
  return (
    <Paper
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (t) => t.zIndex.appBar,
        display: { xs: "block", md: "none" },
      }}
      elevation={0}
    >
      <BottomNavigation
        showLabels
        value={value}
        onChange={(_, v: number) => {
          if (v === 0) navigate("/field");
          if (v === 1) navigate("/evening-report");
          if (v === 2) navigate("/tomorrow");
        }}
      >
        <BottomNavigationAction label="Home" icon={<HomeOutlinedIcon />} />
        <BottomNavigationAction label="Report" icon={<DescriptionOutlinedIcon />} />
        <BottomNavigationAction label="Plan" icon={<EventNoteOutlinedIcon />} />
        <BottomNavigationAction label="More" icon={<MoreHorizIcon />} />
      </BottomNavigation>
    </Paper>
  );
}
