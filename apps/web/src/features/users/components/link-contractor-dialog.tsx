import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { toast } from "sonner";
import { FormDialog } from "@/components/ui/form-dialog.js";
import { ContractorPicker } from "@/features/auth/components/contractor-picker.js";
import { useCreateContractor } from "@/features/contractors/index.js";
import { useLinkUser } from "../hooks/use-users.js";
import type { ManagedUser } from "../types/user.types.js";

const PINNED = { inputLabel: { shrink: true } } as const;

// Link an approved contractor account to its company. A company that signed up as "Other"
// is not in the list yet: "New company" creates it (name pre-filled from sign-up, admin sets the code) and links in one save.
export function LinkContractorDialog({ user, projectId, onClose }: { user: ManagedUser; projectId?: string; onClose: () => void }) {
  const link = useLinkUser();
  const create = useCreateContractor();
  const [mode, setMode] = useState<"existing" | "new">(user.requestedCompanyName ? "new" : "existing");
  const [contractorId, setContractorId] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState(user.requestedCompanyName ?? "");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const busy = link.isPending || create.isPending;
  const error = create.error ?? link.error;
  const codeOk = /^[A-Za-z0-9-]{1,32}$/.test(code.trim());
  const canSave = mode === "existing" ? Boolean(contractorId) : codeOk && name.trim().length > 0 && Boolean(projectId);

  const save = async () => {
    try {
      let id = contractorId;
      if (mode === "new") {
        if (!projectId) return;
        const created = await create.mutateAsync({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          contactName: contactName.trim() || null,
          contactPhone: contactPhone.trim() || null,
          projectId,
        });
        id = created.data.id;
        // From here the company exists: a failed link can be retried by picking it under "Existing company".
        setMode("existing");
        setContractorId(id);
      }
      await link.mutateAsync({ id: user.id, contractorId: id, projectId });
      toast.success(mode === "new" ? `เพิ่มบริษัท ${code.trim().toUpperCase()} และผูกผู้ใช้แล้ว` : "ผูกผู้ใช้กับบริษัทแล้ว");
      onClose();
    } catch {
      // Shown in the dialog.
    }
  };

  return (
    <FormDialog
      open
      title="Link contractor"
      onClose={onClose}
      busy={busy}
      actions={
        <>
          <Button color="inherit" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="contained" disabled={!canSave || busy} onClick={() => void save()}>
            {busy ? "Saving…" : mode === "new" ? "Create company & link" : "Link contractor"}
          </Button>
        </>
      }
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        <Typography>
          {user.email} · {user.username}
          {user.requestedCompanyName ? (
            <Typography component="span" color="text.secondary">
              {" "}
              — กรอกตอนสมัคร: «{user.requestedCompanyName}»
            </Typography>
          ) : null}
        </Typography>
        {error && <Alert severity="error">{error.message}</Alert>}
        <ToggleButtonGroup exclusive fullWidth size="small" value={mode} onChange={(_, v: "existing" | "new" | null) => v && setMode(v)} disabled={busy}>
          <ToggleButton value="existing">Existing company</ToggleButton>
          <ToggleButton value="new">New company</ToggleButton>
        </ToggleButtonGroup>
        {mode === "existing" ? (
          <>
            <ContractorPicker value={contractorId} onChange={setContractorId} allowOther={false} projectId={projectId} disabled={busy} />
            <Typography color="text.secondary">Links this account to the selected company in the current project. The user can then submit daily reports.</Typography>
          </>
        ) : (
          <>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                error={code.length > 0 && !codeOk}
                helperText={code.length > 0 && !codeOk ? "A–Z 0–9 - เท่านั้น" : "รหัสสั้น เช่น SE"}
                slotProps={PINNED}
                sx={{ width: { sm: 160 } }}
                disabled={busy}
              />
              <TextField label="Company name" value={name} onChange={(e) => setName(e.target.value)} slotProps={PINNED} fullWidth disabled={busy} />
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Contact person" value={contactName} onChange={(e) => setContactName(e.target.value)} slotProps={PINNED} fullWidth disabled={busy} />
              <TextField
                label="Phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                slotProps={{ ...PINNED, htmlInput: { inputMode: "tel" } }}
                sx={{ width: { sm: 200 } }}
                disabled={busy}
              />
            </Stack>
            <Typography color="text.secondary">
              สร้างบริษัทใหม่ในโครงการนี้ (สีบนผังเลือกให้อัตโนมัติ แก้ได้ที่หน้า Contractors) แล้วผูกผู้ใช้นี้ทันที
            </Typography>
          </>
        )}
      </Stack>
    </FormDialog>
  );
}
