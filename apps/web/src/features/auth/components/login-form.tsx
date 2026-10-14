import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useForm } from "react-hook-form";
import { useLogin } from "../hooks/use-login.js";
import { loginFormSchema, type LoginFormValues } from "../schemas/login.schema.js";

export function LoginForm() {
  const mutation = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate({ identifier: values.identifier, password: values.password });
  });

  return (
    <Stack spacing={2} component="form" onSubmit={onSubmit} noValidate>
      {mutation.isError ? (
        <Alert severity="error">
          {mutation.error instanceof Error ? mutation.error.message : "Unable to sign in."}
        </Alert>
      ) : null}
      <TextField
        label="Email or username"
        type="text"
        autoComplete="username"
        {...register("identifier")}
        error={Boolean(errors.identifier)}
        helperText={errors.identifier?.message}
      />
      <TextField label="Password" type="password" autoComplete="current-password" {...register("password")} error={Boolean(errors.password)} helperText={errors.password?.message} />
      <Button type="submit" disabled={isSubmitting || mutation.isPending} fullWidth>
        {mutation.isPending ? "Signing in…" : "Sign in"}
      </Button>
    </Stack>
  );
}
