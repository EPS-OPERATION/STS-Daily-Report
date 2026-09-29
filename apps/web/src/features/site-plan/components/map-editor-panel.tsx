import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { useSitePlanEditor } from "../hooks/use-site-plan-editor.js";
import type { ZoneOption } from "../types/site-plan.types.js";

type Editor = ReturnType<typeof useSitePlanEditor>;

// Right-side configuration panel for Edit Map. Geometry drafts stay local
// until Save; zone assignment, reset and delete call their own endpoints.
export function MapEditorPanel({
  editor,
  zones,
  mappedZoneIds,
  customAreaIds,
  onSave,
  saving,
  onCancel,
  addPointMode,
  onAddPointModeChange,
  onDeleteArea,
  deleting,
  onResetArea,
  resetting,
}: {
  editor: Editor;
  zones: ZoneOption[];
  mappedZoneIds: Set<string>;
  customAreaIds: Set<string>;
  onSave: () => void;
  saving: boolean;
  onCancel: () => void;
  addPointMode: boolean;
  onAddPointModeChange: (v: boolean) => void;
  onDeleteArea: (areaId: string) => void;
  deleting: boolean;
  onResetArea: (areaId: string) => void;
  resetting: boolean;
}) {
  const [drawZoneId, setDrawZoneId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selected = editor.selected;
  const selectedZone = zones.find((z) => z.id === selected?.zoneId) ?? null;
  const unmapped = zones.filter((z) => !mappedZoneIds.has(z.id));
  const drawZone = zones.find((z) => z.id === drawZoneId) ?? null;

  return (
    <Stack spacing={2.5}>
      <Stack spacing={0.5}>
        <Typography variant="h4">Zone Configuration</Typography>
        {editor.dirty ? (
          <Chip size="small" label="Unsaved changes" color="warning" sx={{ alignSelf: "flex-start" }} />
        ) : (
          <Typography variant="caption" color="text.secondary">
            Select a polygon to configure it.
          </Typography>
        )}
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Mapped {mappedZoneIds.size} · Unmapped {unmapped.length}
      </Typography>

      {selected ? (
        <Stack spacing={2}>
          <Autocomplete
            size="small"
            options={zones}
            getOptionLabel={(z) => `${z.code} — ${z.name}`}
            value={selectedZone}
            onChange={(_, v) => {
              if (v) editor.assignZone(selected.key, v.id);
            }}
            renderInput={(params) => <TextField {...params} label="Assigned WBS zone" />}
          />
          <Typography variant="body2" color="text.secondary">
            Geometry · {selected.points.length} points
            {selected.isNew ? " · new area (not saved yet)" : ""}
            {selected.areaId && customAreaIds.has(selected.areaId) ? " · customized" : ""}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
            <Button
              size="small"
              variant={addPointMode ? "contained" : "outlined"}
              color="inherit"
              onClick={() => onAddPointModeChange(!addPointMode)}
            >
              {addPointMode ? "Adding… click edge" : "Add point"}
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              disabled={editor.selectedVertex == null}
              onClick={() => {
                if (editor.selectedVertex != null && editor.deleteVertex(selected.key, editor.selectedVertex)) {
                  editor.selectVertex(null);
                }
              }}
            >
              Delete vertex
            </Button>
          </Stack>
          {selected.points.length <= 3 ? (
            <Typography variant="caption" color="text.secondary">
              Minimum 3 points — deletion disabled below that.
            </Typography>
          ) : null}
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              disabled={selected.isNew || resetting}
              onClick={() => selected.areaId && onResetArea(selected.areaId)}
            >
              Reset to default
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={selected.isNew || deleting}
              onClick={() => setConfirmDelete(true)}
            >
              Delete area
            </Button>
          </Stack>
        </Stack>
      ) : null}

      {editor.drawing ? (
        <Stack spacing={1.5}>
          <Alert severity="info">
            Drawing {drawZone ? `${drawZone.code} — ${drawZone.name}` : ""} · {editor.drawing.points.length} points
            (need at least 3)
          </Alert>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" color="inherit" onClick={editor.undoDrawPoint}>
              Undo point
            </Button>
            <Button size="small" variant="outlined" color="inherit" onClick={editor.cancelDrawing}>
              Cancel
            </Button>
            <Button size="small" disabled={editor.drawing.points.length < 3} onClick={() => editor.finishDrawing()}>
              Finish area
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Stack spacing={1.5}>
          <Typography variant="h6">Add zone area</Typography>
          <Autocomplete
            size="small"
            options={unmapped}
            getOptionLabel={(z) => `${z.code} — ${z.name}`}
            value={drawZone}
            onChange={(_, v) => setDrawZoneId(v?.id ?? null)}
            renderInput={(params) => <TextField {...params} label="Unmapped WBS zone" />}
          />
          <Button
            variant="outlined"
            startIcon={<AddOutlinedIcon fontSize="small" />}
            disabled={!drawZone}
            onClick={() => drawZone && editor.startDrawing(drawZone.id)}
          >
            Start drawing
          </Button>
          {unmapped.length > 0 ? (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Unmapped zones
              </Typography>
              {unmapped.slice(0, 8).map((z) => (
                <Typography key={z.id} variant="body2" color="text.secondary">
                  {z.code} — {z.name}
                </Typography>
              ))}
              {unmapped.length > 8 ? (
                <Typography variant="caption" color="text.secondary">
                  +{unmapped.length - 8} more — use the search above
                </Typography>
              ) : null}
            </Box>
          ) : null}
        </Stack>
      )}

      <Box sx={{ flexGrow: 1 }} />
      <Stack direction="row" spacing={1.5}>
        <Button variant="outlined" color="inherit" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button fullWidth disabled={!editor.dirty || saving} onClick={onSave}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </Stack>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove map area?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This removes the polygon from the Site Plan. It does not delete the WBS zone or its activities.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="inherit" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button
            color="error"
            disabled={deleting}
            onClick={() => {
              if (selected?.areaId) onDeleteArea(selected.areaId);
              setConfirmDelete(false);
            }}
          >
            Remove area
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
