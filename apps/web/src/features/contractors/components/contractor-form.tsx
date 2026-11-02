import { zodResolver } from "@hookform/resolvers/zod";
import CheckOutlined from "@mui/icons-material/CheckOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { COORDINATION_COLORS } from "@sts/shared";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormDialog } from "@/components/ui/form-dialog.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { useCreateContractor, useUpdateContractor } from "../hooks/use-create-contractor.js";
import { contractorFormSchema, type ContractorFormValues } from "../schemas/contractor.schema.js";
import type { Contractor } from "../types/contractor.types.js";

// Values arrive through reset() after mount, so labels stay pinned above the box.
const PINNED = { inputLabel: { shrink: true } } as const;

// Add a company (no `contractor`) or edit one. `usedColors` lets a new company start on a free map colour.
export function ContractorDialog({
  open,
  onClose,
  contractor,
  usedColors = [],
}: {
  open: boolean;
  onClose: () => void;
  contractor?: Contractor | null;
  usedColors?: string[];
}) {
  const { projectId } = useCurrentProject();
  const create = useCreateContractor();
  const update = useUpdateContractor();
  const mutation = contractor ? update : create;
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContractorFormValues>({ resolver: zodResolver(contractorFormSchema) });

  useEffect(() => {
    if (!open) return;
    const used = new Set(usedColors.map((c) => c.toUpperCase()));
    reset({
      code: contractor?.code ?? "",
      name: contractor?.name ?? "",
      contactName: contractor?.contactName ?? "",
      contactPhone: contractor?.contactPhone ?? "",
      color: contractor?.color ?? COORDINATION_COLORS.find((c) => !used.has(c)) ?? COORDINATION_COLORS[0],
      active: contractor?.active ?? true,
    });
    create.reset();
    update.reset();
    // Reset only when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contractor]);

  const onSubmit = handleSubmit(async (values) => {
    if (!projectId) return;
    const input = {
      code: values.code.toUpperCase(),
      name: values.name,
      contactName: values.contactName || null,
      contactPhone: values.contactPhone || null,
      projectId,
      color: values.color,
    };
    if (contractor) {
      await update.mutateAsync({ id: contractor.id, input: { ...input, active: values.active } });
      toast.success(`บันทึก ${input.code} แล้ว`);
    } else {
      await create.mutateAsync(input);
      toast.success(`เพิ่มบริษัท ${input.code} แล้ว`);
    }
    onClose();
  });

  const busy = isSubmitting || mutation.isPending;
  const owner = contractor ? !contractor.isContractor : false;

  return (
    <FormDialog
      open={open}
      maxWidth="sm"
      title={contractor ? `Edit company · ${contractor.code}` : "Add company"}
      onClose={onClose}
      busy={busy}
      actions={
        <>
          <Button color="inherit" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={busy || !projectId}>
            Save
          </Button>
        </>
      }
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        {mutation.isError && (
          <Alert severity="error">{mutation.error instanceof Error ? mutation.error.message : "Failed to save company"}</Alert>
        )}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="Code"
            {...register("code")}
            error={Boolean(errors.code)}
            helperText={errors.code?.message ?? "รหัสสั้น เช่น SE"}
            slotProps={{ ...PINNED, htmlInput: { style: { textTransform: "uppercase" } } }}
            sx={{ width: { sm: 200 } }}
          />
          <TextField label="Company name" slotProps={PINNED} {...register("name")} error={Boolean(errors.name)} helperText={errors.name?.message} fullWidth />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField label="Contact person" slotProps={PINNED} {...register("contactName")} error={Boolean(errors.contactName)} helperText={errors.contactName?.message} fullWidth />
          <TextField
            label="Phone"
            {...register("contactPhone")}
            error={Boolean(errors.contactPhone)}
            helperText={errors.contactPhone?.message}
            slotProps={{ ...PINNED, htmlInput: { inputMode: "tel" } }}
            sx={{ width: { sm: 220 } }}
          />
        </Stack>
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Map colour
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(28px, 1fr))", gap: 1 }}>
                {COORDINATION_COLORS.map((color) => {
                  const selected = color.toUpperCase() === (field.value ?? "").toUpperCase();
                  return (
                    <Box
                      key={color}
                      component="button"
                      type="button"
                      aria-label={`Pick color ${color}`}
                      aria-pressed={selected}
                      onClick={() => field.onChange(color)}
                      sx={{
                        aspectRatio: "1",
                        p: 0,
                        borderRadius: "50%",
                        bgcolor: color,
                        border: "2px solid",
                        borderColor: selected ? "text.primary" : "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {selected && <CheckOutlined sx={{ fontSize: 14, color: "common.white" }} />}
                    </Box>
                  );
                })}
              </Box>
              {usedColors.some((c) => c.toUpperCase() === field.value?.toUpperCase() && c.toUpperCase() !== contractor?.color?.toUpperCase()) ? (
                <Typography variant="caption" color="warning.dark">
                  สีนี้มีบริษัทอื่นใช้แล้ว — บนผังจะแยกยาก
                </Typography>
              ) : null}
            </Box>
          )}
        />
        {contractor && !owner ? (
          <Controller
            control={control}
            name="active"
            render={({ field }) => (
              <Box>
                <FormControlLabel control={<Switch checked={field.value} onChange={(_, v) => field.onChange(v)} />} label="Active" />
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  ปิด = ซ่อนจากการสมัคร ตัวกรอง และผัง และส่งรายงานใหม่ไม่ได้ — ข้อมูลเก่าและบัญชีผู้ใช้ยังอยู่
                </Typography>
              </Box>
            )}
          />
        ) : null}
      </Stack>
    </FormDialog>
  );
}
