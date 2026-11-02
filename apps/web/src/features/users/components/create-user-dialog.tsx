import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { USER_ROLES } from "@sts/shared";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FormDialog } from "@/components/ui/form-dialog.js";
import { ContractorPicker } from "@/features/auth/components/contractor-picker.js";
import { useCreateUser } from "../hooks/use-users.js";
import { createUserSchema, type CreateUserValues } from "../schemas/user.schema.js";
import { ROLE_LABEL } from "../utils/role-label.js";

// eps_admin adds an account directly: active at once, with the password the admin sets.
// A contractor account is linked to its company in the current project.
export function CreateUserDialog({ projectId, onClose }: { projectId?: string; onClose: () => void }) {
  const mutation = useCreateUser();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { displayName: "", email: "", username: "", password: "", role: "contractor", contractorId: "" },
  });
  const role = form.watch("role");
  const errors = form.formState.errors;
  const submit = form.handleSubmit(async (v) => {
    try {
      await mutation.mutateAsync({
        email: v.email,
        username: v.username,
        displayName: v.displayName || undefined,
        password: v.password,
        role: v.role,
        ...(v.role === "contractor" ? { contractorId: v.contractorId, projectId } : {}),
      });
      onClose();
    } catch {
      /* Displayed in the dialog. */
    }
  });

  return (
    <FormDialog
      title="Add user"
      onClose={onClose}
      busy={mutation.isPending}
      onSubmit={(event) => void submit(event)}
      actions={
        <>
          <Button color="inherit" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create user"}
          </Button>
        </>
      }
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        {mutation.isError && <Alert severity="error">{mutation.error.message}</Alert>}
        <TextField label="Name" placeholder="e.g. Somchai (LCE foreman)" {...form.register("displayName")} />
        <TextField label="Email" type="email" required {...form.register("email")} error={Boolean(errors.email)} helperText={errors.email?.message} />
        <TextField
          label="Username"
          required
          {...form.register("username")}
          error={Boolean(errors.username)}
          helperText={errors.username?.message ?? "3–20 characters: a–z, 0–9, dot, underscore or hyphen. Used to sign in."}
        />
        <TextField
          label="Password"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="new-password"
          {...form.register("password")}
          error={Boolean(errors.password)}
          helperText={errors.password?.message ?? "Give it to the user privately. They can change it later with a reset link."}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((s) => !s)} edge="end">
                    {showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Controller
          name="role"
          control={form.control}
          render={({ field }) => (
            <TextField select label="Role" {...field}>
              {USER_ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        {role === "contractor" ? (
          <>
            <Controller
              name="contractorId"
              control={form.control}
              render={({ field }) => (
                <ContractorPicker value={field.value ?? ""} onChange={field.onChange} allowOther={false} projectId={projectId} error={errors.contractorId?.message} disabled={mutation.isPending} />
              )}
            />
            <Typography variant="body2" color="text.secondary">
              The account is linked to this contractor in the current project, so the user can send daily reports right away.
            </Typography>
          </>
        ) : null}
      </Stack>
    </FormDialog>
  );
}
