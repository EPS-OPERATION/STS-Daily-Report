import FitScreenOutlinedIcon from "@mui/icons-material/FitScreenOutlined";
import ZoomInOutlinedIcon from "@mui/icons-material/ZoomInOutlined";
import ZoomOutOutlinedIcon from "@mui/icons-material/ZoomOutOutlined";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import type { useSitePlanViewport } from "../hooks/use-site-plan-viewport.js";

type ViewportControls = Pick<ReturnType<typeof useSitePlanViewport>, "zoomBy" | "fitAll">;

export function SitePlanViewportControls({
  viewport,
  onFitSelected,
}: {
  viewport: ViewportControls;
  onFitSelected?: () => void;
}) {
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
