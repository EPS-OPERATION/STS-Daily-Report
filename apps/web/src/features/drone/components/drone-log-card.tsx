import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import type { DronePhotoLog } from "../types/drone.types.js";

interface DroneLogCardProps {
  log: DronePhotoLog;
  isSelectedA: boolean;
  isSelectedB: boolean;
  onSelectA: (log: DronePhotoLog) => void;
  onSelectB: (log: DronePhotoLog) => void;
}

export function DroneLogCard({
  log,
  isSelectedA,
  isSelectedB,
  onSelectA,
  onSelectB,
}: DroneLogCardProps) {
  const isSelected = isSelectedA || isSelectedB;

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: isSelected ? "primary.main" : "divider",
        borderRadius: 2.5,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        boxShadow: isSelected ? 3 : 0,
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          borderColor: "primary.light",
          boxShadow: 2,
        },
      }}
    >
      {/* Thumbnail with overlay tags */}
      <Box sx={{ position: "relative", height: 180, bgcolor: "grey.900" }}>
        <CardMedia
          component="img"
          image={log.imageUrl}
          alt={log.title}
          sx={{ height: "100%", width: "100%", objectFit: "cover" }}
        />
        <Box
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
            display: "flex",
            gap: 0.5,
          }}
        >
          {isSelectedA && (
            <Chip size="small" label="ภาพฐาน (Baseline)" color="default" sx={{ fontWeight: 700, bgcolor: "#fff", color: "#000" }} />
          )}
          {isSelectedB && (
            <Chip size="small" label="ภาพเปรียบเทียบ (Target)" color="primary" sx={{ fontWeight: 700 }} />
          )}
        </Box>
      </Box>

      {/* Card Content */}
      <CardContent sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <Stack spacing={1}>
          {/* Date Row */}
          <Stack direction="row" spacing={0.75} alignItems="center">
            <CalendarTodayIcon sx={{ fontSize: 15, color: "text.secondary" }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
              {log.date}
            </Typography>
            {log.capturedBy && (
              <Typography variant="caption" color="text.disabled">
                · {log.capturedBy}
              </Typography>
            )}
          </Stack>

          {/* Title */}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {log.title}
          </Typography>

          {/* Description */}
          <Typography variant="body2" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {log.description}
          </Typography>

          {/* Tags */}
          {log.tags && log.tags.length > 0 && (
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5, pt: 0.5 }}>
              {log.tags.map((t) => (
                <Chip key={t} label={t} size="small" variant="outlined" sx={{ height: 22, fontSize: "0.7rem" }} />
              ))}
            </Stack>
          )}
        </Stack>

        {/* Action Buttons to select into comparison */}
        <Stack direction="row" spacing={1} sx={{ pt: 2, mt: "auto" }}>
          <Button
            size="small"
            variant={isSelectedA ? "contained" : "outlined"}
            color={isSelectedA ? "inherit" : "primary"}
            onClick={() => onSelectA(log)}
            fullWidth
            sx={{ textTransform: "none", fontSize: "0.75rem", fontWeight: 600 }}
          >
            {isSelectedA ? "✓ เป็นภาพฐาน" : "เลือกเป็นภาพฐาน"}
          </Button>
          <Button
            size="small"
            variant={isSelectedB ? "contained" : "outlined"}
            color="primary"
            onClick={() => onSelectB(log)}
            fullWidth
            sx={{ textTransform: "none", fontSize: "0.75rem", fontWeight: 600 }}
          >
            {isSelectedB ? "✓ เป็นภาพเปรียบเทียบ" : "เลือกเพื่อเปรียบเทียบ"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
