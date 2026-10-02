import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import SplitScreenIcon from "@mui/icons-material/Splitscreen";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import type { DronePhotoLog } from "../types/drone.types.js";

interface DroneSplitSliderProps {
  photoA: DronePhotoLog;
  photoB: DronePhotoLog;
}

export function DroneSplitSlider({ photoA, photoB }: DroneSplitSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"slider" | "sideBySide">("slider");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const handlePointerDown = () => {
    setIsDragging(true);
  };

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pos = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(pos);
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

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
      {/* Top Controller Toolbar */}
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
        {/* View Mode Controls */}
        <ButtonGroup size="small" variant="outlined">
          <Button
            variant={viewMode === "slider" ? "contained" : "outlined"}
            startIcon={<SplitScreenIcon />}
            onClick={() => setViewMode("slider")}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            สไลเดอร์เปรียบเทียบ (Split Comparison)
          </Button>
          <Button
            variant={viewMode === "sideBySide" ? "contained" : "outlined"}
            startIcon={<ViewColumnIcon />}
            onClick={() => setViewMode("sideBySide")}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            เปรียบเทียบคู่ขนาน (Side-by-Side)
          </Button>
        </ButtonGroup>

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
          <Typography variant="caption" sx={{ minWidth: 42, textAlign: "center", fontWeight: 600, color: "text.secondary" }}>
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
          height: isFullscreen ? "calc(100vh - 60px)" : { xs: 360, sm: 500, md: 580 },
          bgcolor: "#0b0f19",
          overflow: "hidden",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        {viewMode === "slider" ? (
          /* Split Slider View */
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: "100%",
              transform: `scale(${zoomLevel})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.15s ease-out",
            }}
          >
            {/* Target Image (Photo B / After) - Underneath Layer */}
            <Box
              component="img"
              src={photoB.imageUrl}
              alt={`Photo B ${photoB.date}`}
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "contain",
                pointerEvents: "none",
              }}
            />

            {/* Base Image (Photo A / Before) - Clipped Top Layer */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                pointerEvents: "none",
              }}
            >
              <Box
                component="img"
                src={photoA.imageUrl}
                alt={`Photo A ${photoA.date}`}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </Box>

            {/* Draggable Divider Line & Knob */}
            <Box
              onPointerDown={handlePointerDown}
              sx={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${sliderPosition}%`,
                width: 4,
                bgcolor: "#ffffff",
                transform: "translateX(-50%)",
                cursor: "ew-resize",
                zIndex: 10,
                boxShadow: "0 0 12px rgba(0,0,0,0.6)",
                "&:hover .slider-knob": {
                  transform: "translate(-50%, -50%) scale(1.1)",
                },
              }}
            >
              <Box
                className="slider-knob"
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.4), 0 0 0 3px #ffffff",
                  transition: "transform 0.1s ease",
                  cursor: "ew-resize",
                }}
              >
                <CompareArrowsIcon sx={{ fontSize: 24 }} />
              </Box>
            </Box>
          </Box>
        ) : (
          /* Side-by-Side View */
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              height: "100%",
              width: "100%",
              gap: "2px",
              bgcolor: "grey.900",
            }}
          >
            {/* Left Frame: Photo A */}
            <Box sx={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
              <Box
                component="img"
                src={photoA.imageUrl}
                alt={`Photo A ${photoA.date}`}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  bottom: 16,
                  left: 16,
                  bgcolor: "rgba(15, 23, 42, 0.85)",
                  backdropFilter: "blur(6px)",
                  color: "#fff",
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1.5,
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
                  ภาพที่ 1: {photoA.date}
                </Typography>
                <Typography variant="caption" sx={{ color: "grey.300" }}>
                  {photoA.title}
                </Typography>
              </Box>
            </Box>

            {/* Right Frame: Photo B */}
            <Box sx={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
              <Box
                component="img"
                src={photoB.imageUrl}
                alt={`Photo B ${photoB.date}`}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  bottom: 16,
                  left: 16,
                  bgcolor: "rgba(15, 23, 42, 0.85)",
                  backdropFilter: "blur(6px)",
                  color: "#fff",
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1.5,
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, display: "block", color: "primary.light" }}>
                  ภาพที่ 2: {photoB.date}
                </Typography>
                <Typography variant="caption" sx={{ color: "grey.300" }}>
                  {photoB.title}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Date Badges in Split Mode */}
        {viewMode === "slider" && (
          <>
            <Box
              sx={{
                position: "absolute",
                top: 16,
                left: 16,
                bgcolor: "rgba(15, 23, 42, 0.88)",
                backdropFilter: "blur(8px)",
                color: "#ffffff",
                px: 1.75,
                py: 1,
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.15)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                pointerEvents: "none",
                zIndex: 8,
              }}
            >
              <Typography variant="caption" sx={{ color: "grey.400", fontWeight: 700, display: "block" }}>
                ภาพสำรวจฐาน (Baseline Survey)
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {photoA.date}
              </Typography>
              <Typography variant="caption" sx={{ color: "grey.300" }}>
                {photoA.title}
              </Typography>
            </Box>

            <Box
              sx={{
                position: "absolute",
                top: 16,
                right: 16,
                bgcolor: "rgba(15, 23, 42, 0.88)",
                backdropFilter: "blur(8px)",
                color: "#ffffff",
                px: 1.75,
                py: 1,
                borderRadius: 2,
                border: "1px solid rgba(59, 130, 246, 0.4)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                pointerEvents: "none",
                textAlign: "right",
                zIndex: 8,
              }}
            >
              <Typography variant="caption" sx={{ color: "primary.light", fontWeight: 700, display: "block" }}>
                ภาพสำรวจเปรียบเทียบ (Target Survey)
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {photoB.date}
              </Typography>
              <Typography variant="caption" sx={{ color: "grey.300" }}>
                {photoB.title}
              </Typography>
            </Box>
          </>
        )}
      </Box>

      {/* Bottom Hint */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          px: 2.5,
          py: 1,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "grey.900" : "grey.50"),
        }}
      >
        <Typography variant="caption" color="text.secondary">
          💡 ลากแถบเลื่อนตรงกลางซ้าย-ขวา เพื่อตรวจสอบความเปลี่ยนแปลงทางกายภาพของโครงสร้างหน้างาน
        </Typography>
      </Stack>
    </Paper>
  );
}
