import AddIcon from "@mui/icons-material/AddOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBackOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { PartInput, SiteMapBuilding } from "@/features/site-plan/index.js";
import type { SiteMapEditor } from "../hooks/use-site-map-editor.js";

export function PartsPanel({ ed, building }: { ed: SiteMapEditor; building: SiteMapBuilding }) {
  const { writer, view, setMode, part, setPart, partPoint, setPartPoint, saving, setPendingConfirm, savedPart, guardDiscard, discard, choosePart, newPart, run, VIEW_LABEL } = ed;
  return (
    <Box sx={{ p: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <IconButton
          size="small"
          aria-label="Back to facilities"
          onClick={() => {
            guardDiscard(() => {
              discard();
              setPart(null);
              setMode("building");
            });
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.4 }}>
            {building.name} · {building.code}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            Work Parts · {building.parts.length}
          </Typography>
        </Box>
      </Stack>
      <Button
        startIcon={<AddIcon />}
        sx={{ mt: 1.5 }}
        onClick={() => guardDiscard(() => newPart(building))}
      >
        Add Part
      </Button>
      <List dense sx={{ mt: 1 }}>
        {building.parts.map((p) => (
          <ListItemButton key={p.id} selected={p.id === part?.id} onClick={() => choosePart(p)} sx={{ borderRadius: 1 }}>
            <ListItemText
              primary={p.name}
              secondary={`${p.code} · ${p.status === "active" ? "Active" : "Inactive"}${p.markers[view] ? "" : ` · ยังไม่วางหมุด (${VIEW_LABEL[view]})`}`}
            />
          </ListItemButton>
        ))}
        {part && part.id === null ? (
          <ListItemButton selected sx={{ borderRadius: 1 }}>
            <ListItemText primary={`${part.name} (ใหม่)`} secondary={part.code} />
          </ListItemButton>
        ) : null}
      </List>
      {part ? (
        <Stack spacing={1.5} sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {part.name || "Part"}
            </Typography>
            {part.id ? (
              <IconButton
                size="small"
                aria-label="Delete part"
                disabled={saving}
                onClick={() =>
                  setPendingConfirm({
                    title: `Delete ${part.name}?`,
                    description: "Part นี้จะถูกลบถาวร",
                    run: () =>
                      run(async () => {
                        await writer.deletePart(part.id!);
                        setPart(null);
                        setPartPoint(null);
                      }),
                  })
                }
              >
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            ) : null}
          </Stack>
          <TextField size="small" label="Part name" value={part.name} onChange={(e) => setPart({ ...part, name: e.target.value })} />
          <TextField
            size="small"
            label="Part code"
            value={part.code}
            onChange={(e) => setPart({ ...part, code: e.target.value.toUpperCase() })}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={part.status}
            onChange={(e) => setPart({ ...part, status: e.target.value as PartInput["status"] })}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Location{" "}
              <Typography component="span" variant="caption" color="text.secondary">
                (optional)
              </Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {partPoint || savedPart?.markers[view] ? `วางแล้วใน ${VIEW_LABEL[view]}` : "ยังไม่ได้วางหมุด"} — คลิกบนแผนที่เพื่อวาง
              ลากหมุดเพื่อย้าย
            </Typography>
            {savedPart?.markers[view] && !partPoint ? (
              <Button
                color="error"
                disabled={saving}
                onClick={() => run(async () => void (await writer.setPartMarker(savedPart.id, view, null)))}
              >
                Delete part marker
              </Button>
            ) : null}
          </Box>
        </Stack>
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          Work Part คือส่วนย่อยของอาคาร (ไม่บังคับ) เช่น ฐานราก, Line A–D
        </Typography>
      )}
    </Box>
  );
}
