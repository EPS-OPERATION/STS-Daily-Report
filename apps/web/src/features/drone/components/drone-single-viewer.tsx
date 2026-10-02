import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CameraAltOutlinedIcon from "@mui/icons-material/CameraAltOutlined";
import type { DronePhotoLog } from "../types/drone.types.js";

interface DroneSingleViewerProps {
  photo: DronePhotoLog;
}

export function DroneSingleViewer({ photo }: DroneSingleViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      {/* Top Controller Bar */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "grey.900" : "grey.50"),
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Chip
            icon={<CameraAltOutlinedIcon fontSize="small" />}
            label="Single Survey View"
            color="primary"
            size="small"
            sx={{ fontWeight: 700 }}
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {photo.title}
          </Typography>
        </Stack>

        {/* Zoom & Fullscreen Toolbar */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title="ขยายภาพ">
            <span>
              <IconButton
                size="small"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                disabled={zoomLevel >= 2.5}
              >
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Typography variant="caption" sx={{ minWidth: 42, textAlign: "center", fontWeight: 700, color: "text.secondary" }}>
            {Math.round(zoomLevel * 100)}%
          </Typography>
          <Tooltip title="ย่อภาพ">
            <span>
              <IconButton
                size="small"
                onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
                disabled={zoomLevel <= 1}
              >
                <ZoomOutIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="รีเซ็ตขนาดปกติ">
            <span>
              <IconButton size="small" onClick={() => setZoomLevel(1)} disabled={zoomLevel === 1}>
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={isFullscreen ? "ออกจากโหมดเต็มจอ" : "ดูแบบเต็มจอ (Fullscreen)"}>
            <IconButton size="small" onClick={toggleFullscreen}>
              {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Main Image Display Area */}
      <Box
        ref={containerRef}
        sx={{
          position: "relative",
          width: "100%",
          height: isFullscreen ? "calc(100vh - 60px)" : { xs: 380, sm: 520, md: 620 },
          bgcolor: "#0b0f19",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        <Box
          component="img"
          src={photo.imageUrl}
          alt={photo.title}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: `scale(${zoomLevel})`,
            transformOrigin: "center center",
            transition: "transform 0.15s ease-out",
          }}
        />

        {/* Survey Metadata Badge */}
        <Box
          sx={{
            position: "absolute",
            bottom: 20,
            left: 20,
            bgcolor: "rgba(15, 23, 42, 0.88)",
            backdropFilter: "blur(8px)",
            color: "#ffffff",
            p: 2,
            borderRadius: 2.5,
            maxWidth: 420,
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
          }}
        >
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <CalendarTodayIcon sx={{ fontSize: 16, color: "primary.light" }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                วันที่สำรวจ: {photo.date}
              </Typography>
              {photo.capturedBy && (
                <Chip size="small" label={photo.capturedBy} sx={{ height: 20, fontSize: "0.68rem", bgcolor: "rgba(255,255,255,0.15)", color: "#fff" }} />
              )}
            </Stack>
            <Typography variant="body2" sx={{ color: "grey.200", lineHeight: 1.4 }}>
              {photo.description}
            </Typography>
            {photo.tags && photo.tags.length > 0 && (
              <Stack direction="row" spacing={0.5} sx={{ pt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
                {photo.tags.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.68rem",
                      bgcolor: "rgba(255,255,255,0.1)",
                      color: "grey.300",
                    }}
                  />
                ))}
              </Stack>
            )}
          </Stack>
        </Box>
      </Box>
    </Paper>
  );
}
