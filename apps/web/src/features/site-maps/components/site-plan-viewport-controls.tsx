import FitScreenOutlinedIcon from "@mui/icons-material/FitScreenOutlined";
import ZoomInOutlinedIcon from "@mui/icons-material/ZoomInOutlined";
import ZoomOutOutlinedIcon from "@mui/icons-material/ZoomOutOutlined";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import type { useSitePlanViewport } from "@/features/site-maps/hooks/use-site-plan-viewport.js";

type ViewportControls = Pick<ReturnType<typeof useSitePlanViewport>, "zoomBy" | "fitAll">;

export function SitePlanViewportControls({
  viewport,
  onFitSelected,
  compact = false,
}: {
  viewport: ViewportControls;
  onFitSelected?: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Paper
        variant="outlined"
        sx={{
          position: "absolute",
          left: { xs: 10, sm: 16 },
          bottom: { xs: 10, sm: 16 },
          zIndex: 1,
          p: 0.25,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Stack divider={<Divider flexItem />}>
          <Tooltip title="Zoom in" placement="right">
            <IconButton size="small" aria-label="Zoom in" onClick={() => viewport.zoomBy(1.25)}>
              <ZoomInOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom out" placement="right">
            <IconButton size="small" aria-label="Zoom out" onClick={() => viewport.zoomBy(0.8)}>
              <ZoomOutOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Fit view" placement="right">
            <IconButton size="small" aria-label="Fit view" onClick={viewport.fitAll}>
              <FitScreenOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack direction="row" spacing={1} sx={{ position: "absolute", left: 32, bottom: 32, zIndex: 1 }}>
      <Button
        variant="outlined"
        color="inherit"
        onClick={() => viewport.zoomBy(1.25)}
        aria-label="Zoom in"
        sx={{ minWidth: 40, bgcolor: "background.paper" }}
      >
        <ZoomInOutlinedIcon fontSize="small" />
      </Button>
      <Button
        variant="outlined"
        color="inherit"
        onClick={() => viewport.zoomBy(0.8)}
        aria-label="Zoom out"
        sx={{ minWidth: 40, bgcolor: "background.paper" }}
      >
        <ZoomOutOutlinedIcon fontSize="small" />
      </Button>
      <Button
        variant="outlined"
        color="inherit"
        onClick={viewport.fitAll}
        aria-label="Fit all"
        sx={{ minWidth: 40, bgcolor: "background.paper" }}
      >
        <FitScreenOutlinedIcon fontSize="small" />
      </Button>
      {onFitSelected ? (
        <Button
          variant="outlined"
          color="inherit"
          onClick={onFitSelected}
          aria-label="Fit selected zone"
          sx={{ bgcolor: "background.paper" }}
        >
          Fit zone
        </Button>
      ) : null}
    </Stack>
  );
}
