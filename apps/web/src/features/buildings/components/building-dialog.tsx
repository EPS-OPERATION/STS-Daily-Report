import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { toast } from "sonner";
import { FormDialog } from "@/components/ui/form-dialog.js";
import { HttpError } from "@/services/http/client.js";
import { useCreateBuilding, useUpdateBuilding } from "../hooks/use-buildings.js";
import type { ManagedBuilding } from "../types/building.types.js";

// Add / edit one building: code (unique in the project), English name, Thai name.
export function BuildingDialog({ projectId, building, onClose }: { projectId: string; building: ManagedBuilding | null; onClose: () => void }) {
  const create = useCreateBuilding(projectId);
  const update = useUpdateBuilding(projectId);
  const [code, setCode] = useState(building?.code ?? "");
  const [name, setName] = useState(building?.name ?? "");
  const [nameTh, setNameTh] = useState(building?.nameTh ?? "");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;
  const codeErr = touched && !code.trim() ? "กรอกรหัสอาคาร" : null;
  const nameErr = touched && !name.trim() ? "กรอกชื่ออาคาร (อังกฤษ)" : null;

  const save = async () => {
    setTouched(true);
    setError(null);
    if (!code.trim() || !name.trim()) return;
    const input = { code: code.trim(), name: name.trim(), nameTh: nameTh.trim() || null };
    try {
      if (building) {
        await update.mutateAsync({ id: building.id, input });
        toast.success("บันทึกอาคารแล้ว");
      } else {
        await create.mutateAsync(input);
        toast.success("เพิ่มอาคารแล้ว");
      }
      onClose();
    } catch (err) {
      setError(err instanceof HttpError && err.status === 409 ? `รหัส "${input.code}" มีอยู่แล้วในโครงการนี้` : err instanceof HttpError ? err.message : "บันทึกไม่สำเร็จ");
    }
  };

  return (
    <FormDialog
      title={building ? `แก้ไขอาคาร: ${building.code}` : "เพิ่มอาคาร"}
      onClose={onClose}
      busy={saving}
      maxWidth="sm"
      dividers
      mobileFullScreen
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
      actions={
        <>
          <Button color="inherit" onClick={onClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "กำลังบันทึก…" : building ? "บันทึก" : "เพิ่มอาคาร"}
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <TextField
          label="รหัสอาคาร (Code)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          error={Boolean(codeErr)}
          helperText={codeErr ?? "สั้น ๆ ไม่ซ้ำในโครงการ เช่น TG, ACC, WTP"}
          slotProps={{ htmlInput: { maxLength: 20 } }}
          autoFocus={!building}
          required
        />
        <TextField
          label="ชื่ออาคาร (English)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={Boolean(nameErr)}
          helperText={nameErr ?? undefined}
          slotProps={{ htmlInput: { maxLength: 120 } }}
          required
        />
        <TextField
          label="ชื่ออาคาร (ภาษาไทย)"
          value={nameTh}
          onChange={(e) => setNameTh(e.target.value)}
          helperText="ไม่บังคับ"
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />
        {building && building.usage > 0 ? (
          <Alert severity="info">อาคารนี้ใช้ในรายงานแล้ว {building.usage} รายการ — แก้ชื่อแล้วรายงานเก่าจะแสดงชื่อใหม่</Alert>
        ) : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </FormDialog>
  );
}
