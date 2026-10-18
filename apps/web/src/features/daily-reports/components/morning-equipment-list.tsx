import { SITE_EQUIPMENT_TYPES } from "@sts/shared";
import { useState } from "react";
import { NumberStepper } from "./number-stepper.js";
import AddIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

// Machines beyond the fixed list: free-text name + count, stored under the same
// equipment record keyed by name. Standard rows stay in CountList above.
export function CustomEquipmentList({
  values,
  onChange,
}: {
  values: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const standard = new Set<string>(SITE_EQUIPMENT_TYPES);
  const customKeys = Object.keys(values).filter((k) => !standard.has(k));

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("ระบุชื่อเครื่องจักร/อุปกรณ์");
      return;
    }
    if (trimmed.length > 120) {
      setError("ชื่อยาวเกินไป (สูงสุด 120 ตัวอักษร)");
      return;
    }
    const lower = trimmed.toLowerCase();
    if (SITE_EQUIPMENT_TYPES.some((s) => s.toLowerCase() === lower) || customKeys.some((k) => k.toLowerCase() === lower)) {
      setError(`"${trimmed}" มีในรายการแล้ว — เพิ่มจำนวนที่รายการนั้นได้เลย`);
      return;
    }
    if (Object.values(values).filter((n) => (n ?? 0) > 0).length >= 30) {
      setError("ได้สูงสุด 30 รายการ");
      return;
    }
    onChange({ ...values, [trimmed]: 1 });
    setName("");
    setError(null);
  };

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
      <Box sx={{ px: 1.5, pt: 1.25, pb: customKeys.length > 0 ? 0.5 : 1.25 }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Other (อื่นๆ)
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          เช่น รถเครนเฉพาะทาง เครื่องปั่นไฟ — พิมพ์ชื่อแล้วกดเพิ่ม
        </Typography>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <TextField
            label="Machinery / equipment name"
            placeholder="เช่น เครื่องปั่นไฟ 100 kVA"
            size="small"
            fullWidth
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            error={Boolean(error)}
            helperText={error ?? undefined}
            slotProps={{ htmlInput: { maxLength: 120 } }}
          />
          <Button variant="outlined" startIcon={<AddIcon />} onClick={add} sx={{ flexShrink: 0, height: 40 }}>
            Add
          </Button>
        </Stack>
      </Box>
      {customKeys.map((key) => (
        <Stack
          key={key}
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ px: 1.5, py: 0.75, borderTop: 1, borderColor: "divider", bgcolor: (values[key] ?? 0) > 0 ? "primary.light" : "background.paper" }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
              {key}
            </Typography>
          </Box>
          <NumberStepper label={`จำนวน ${key}`} value={values[key] ?? 0} onChange={(n) => onChange({ ...values, [key]: n })} min={0} max={500} unit="เครื่อง" />
          <IconButton
            size="small"
            aria-label={`Delete ${key}`}
            onClick={() => {
              const next = { ...values };
              delete next[key];
              onChange(next);
            }}
            sx={{ border: 1, borderColor: "divider", width: 32, height: 32 }}
          >
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </IconButton>
        </Stack>
      ))}
    </Box>
  );
}
