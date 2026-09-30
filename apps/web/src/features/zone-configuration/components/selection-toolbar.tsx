import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import RemoveOutlinedIcon from "@mui/icons-material/RemoveOutlined";
import RestartAltOutlinedIcon from "@mui/icons-material/RestartAltOutlined";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { zoneColorPresets } from "../utils/zone-color.js";

// Canva-style selection tools for the selected map area. Floating mode is
// positioned over the map by the page; docked mode sits in a top action bar
// above the map. All edits stay draft-local until Save. Remove mapping uses
// a two-step confirm inline.
export function SelectionToolbar({
  x,
  y,
  layout = "floating",
  mode = "full",
  zoneCode,
  addPointMode = false,
  canDeleteVertex = false,
  canDuplicate,
  canReset = false,
  disabled,
  onToggleAddPoint = () => undefined,
  onDeleteVertex = () => undefined,
  onDuplicate,
  onReset = () => undefined,
  onRemove,
  onClose,
  colorValue = null,
  colorsDisabled = false,
  onColorChange,
}: {
  x?: number;
  y?: number;
  layout?: "floating" | "docked";
  mode?: "full" | "quick";
  zoneCode: string;
  addPointMode?: boolean;
  canDeleteVertex?: boolean;
  canDuplicate: boolean;
  canReset?: boolean;
  disabled: boolean;
  onToggleAddPoint?: () => void;
  onDeleteVertex?: () => void;
  onDuplicate: () => void;
  onReset?: () => void;
  onRemove: () => void;
  onClose: () => void;
  colorValue?: string | null;
  colorsDisabled?: boolean;
  onColorChange?: (hex: string) => void;
}) {
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  useEffect(() => {
    setConfirmingRemove(false);
  }, [zoneCode]);

  const docked = layout === "docked";
  return (
    <Paper
      elevation={docked ? 0 : 4}
      role="toolbar"
      aria-label={`${zoneCode} selection tools`}
      sx={
        docked
          ? {
              display: "flex",
              alignItems: "center",
              gap: 0.25,
              px: 0.75,
              py: 0.5,
              flexWrap: "wrap",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
              width: "fit-content",
              maxWidth: "100%",
            }
          : {
              position: "absolute",
              left: x,
              top: y,
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              gap: 0.25,
              px: 0.75,
              py: 0.5,
              transform: "translate(-50%, -100%)",
              maxWidth: "calc(100% - 16px)",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 2,
            }
      }
    >
      <Typography variant="caption" sx={{ fontWeight: 700, px: 0.5, whiteSpace: "nowrap" }}>
        {zoneCode}
      </Typography>
      {mode === "full" ? (
        <Tooltip title={addPointMode ? "Click a boundary edge to add a point" : "Add point"}>
          <span>
            <IconButton
              size="small"
              color={addPointMode ? "primary" : "default"}
              aria-label="Add point"
              aria-pressed={addPointMode}
              onClick={onToggleAddPoint}
              disabled={disabled}
            >
              <AddOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ) : null}
      {mode === "full" ? (
        <Tooltip title="Delete selected point">
          <span>
            <IconButton
              size="small"
              aria-label="Delete selected point"
              onClick={onDeleteVertex}
              disabled={disabled || !canDeleteVertex}
            >
              <RemoveOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ) : null}
      <Tooltip title={canDuplicate ? "Duplicate shape to an unmapped zone" : "No unmapped zone to duplicate to"}>
        <span>
          <IconButton
            size="small"
            aria-label="Duplicate shape"
            onClick={onDuplicate}
            disabled={disabled || !canDuplicate}
          >
            <ContentCopyOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      {mode === "full" ? (
        <Tooltip title="Reset boundary to default">
          <span>
            <IconButton
              size="small"
              aria-label="Reset boundary to default"
              onClick={onReset}
              disabled={disabled || !canReset}
            >
              <RestartAltOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      ) : null}
      <Tooltip title="Remove mapping">
        <span>
          <IconButton
            size="small"
            color={confirmingRemove ? "error" : "default"}
            aria-label={confirmingRemove ? "Confirm remove mapping" : "Remove mapping"}
            onClick={() => {
              if (confirmingRemove) {
                setConfirmingRemove(false);
                onRemove();
              } else {
                setConfirmingRemove(true);
              }
            }}
            onBlur={() => setConfirmingRemove(false)}
            disabled={disabled}
            sx={
              confirmingRemove
                ? { bgcolor: "error.main", color: "common.white", "&:hover": { bgcolor: "error.dark" } }
                : undefined
            }
          >
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Deselect">
        <span>
          <IconButton size="small" aria-label="Deselect" onClick={onClose} disabled={disabled}>
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      {mode === "full" && onColorChange ? (
        <>
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          {zoneColorPresets.map((preset) => {
            const active = colorValue === preset.value;
            return (
              <Tooltip key={preset.value} title={`${preset.name} ${preset.value}`}>
                <IconButton
                  size="small"
                  aria-label={`Use ${preset.name} zone color ${preset.value}`}
                  aria-pressed={active}
                  disabled={disabled || colorsDisabled}
                  onClick={() => onColorChange(preset.value)}
                  sx={{
                    width: 22,
                    height: 22,
                    minHeight: 22,
                    p: 0,
                    borderRadius: "50%",
                    bgcolor: preset.value,
                    border: "1px solid",
                    borderColor: active ? "text.primary" : "divider",
                    outline: active ? "2px solid" : undefined,
                    outlineColor: active ? "primary.main" : undefined,
                    outlineOffset: active ? 2 : undefined,
                    "&:hover": { bgcolor: preset.value, filter: "brightness(0.92)" },
                  }}
                />
              </Tooltip>
            );
          })}
        </>
      ) : null}
    </Paper>
  );
}
