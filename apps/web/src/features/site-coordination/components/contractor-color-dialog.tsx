import { COORDINATION_COLORS } from "@sts/shared";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "sonner";
import { FormDialog } from "@/components/ui/form-dialog.js";
import type { UseCoordinationWorkspaceState } from "../hooks/use-coordination-workspace.js";

export function ContractorColorDialog({ ed }: { ed: UseCoordinationWorkspaceState }) {
  const { colorTarget, setColorTarget, chosenColor, setChosenColor, colorRevision, changeColor, data } = ed;
  return (
    <FormDialog
      maxWidth="xs"
      title={<>Contractor color · {data?.contractors.find((c) => c.id === colorTarget)?.code}</>}
      onClose={() => setColorTarget(null)}
      busy={changeColor.isPending}
      open={Boolean(colorTarget)}
      actions={
        <>
          <Button color="inherit" disabled={changeColor.isPending} onClick={() => setColorTarget(null)}>Cancel</Button><Button disabled={changeColor.isPending} onClick={async () => {
        if (!colorTarget) return;
        try { await changeColor.mutateAsync({ contractorId: colorTarget, color: chosenColor, revision: colorRevision }); setColorTarget(null); toast.success("อัปเดตสีผู้รับเหมาแล้ว"); } catch { /* Preserve the selected colour for retry. */ }
      }}>Save color</Button>
        </>
      }
    >
        {changeColor.isError && <Alert severity="error" sx={{ mb: 2 }}>{changeColor.error.message}</Alert>}
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
          <Box component="label" sx={{ position: "relative", width: 46, height: 46, borderRadius: "50%", bgcolor: chosenColor || COORDINATION_COLORS[0], border: "2px solid", borderColor: "divider", cursor: "pointer", flexShrink: 0, boxShadow: "inset 0 0 0 3px #fff" }}>
            <input type="color" value={chosenColor || COORDINATION_COLORS[0]} onChange={(e) => setChosenColor(e.target.value)} aria-label="Pick custom color"
              style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
          </Box>
          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>{chosenColor || COORDINATION_COLORS[0]}</Typography>
            <Typography variant="caption" color="text.secondary">แตะวงกลมเพื่อเลือกสีเอง หรือเลือกจากชุดด้านล่าง</Typography>
          </Stack>
          <Chip size="small" variant="outlined" label={data?.contractors.find((c) => c.id === colorTarget)?.code}
            icon={<Box component="span" sx={{ width: 9, height: 9, bgcolor: chosenColor || COORDINATION_COLORS[0], borderRadius: "50%" }} />}
            sx={{ ml: "auto", flexShrink: 0, borderColor: chosenColor || COORDINATION_COLORS[0], fontWeight: 700, "& .MuiChip-icon": { ml: 1, mr: -0.5 } }} />
        </Stack>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 1.25 }}>
          {COORDINATION_COLORS.map((color) => {
            const active = color.toUpperCase() === (chosenColor || "").toUpperCase();
            return <Box key={color} component="button" type="button" aria-label={`Pick color ${color}`} onClick={() => setChosenColor(color)}
              sx={{ aspectRatio: "1", p: 0, borderRadius: "50%", bgcolor: color, border: "2px solid", borderColor: active ? "text.primary" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform 120ms ease", "&:hover": { transform: "scale(1.1)" } }}>
              {active && <CheckOutlined sx={{ fontSize: 15, color: "common.white" }} />}
            </Box>;
          })}
        </Box>
    </FormDialog>
  );
}
