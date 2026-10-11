import { zodResolver } from "@hookform/resolvers/zod";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuthConfig } from "../hooks/use-auth-config.js";
import { useLogin } from "../hooks/use-login.js";
import { demoFormSchema, loginFormSchema, type LoginFormValues } from "../schemas/login.schema.js";

export function LoginForm() {
  const mutation = useLogin();
  const [demo, setDemo] = useState(false);
  // Hosted demo asks for a shared access code; local dev does not.
  const config = useAuthConfig();
  const needsCode = Boolean(config.data?.data.accessCodeRequired);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<LoginFormValues & { accessCode?: string }>({ resolver: zodResolver(demo ? demoFormSchema : loginFormSchema) });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(demo ? { email: values.identifier, accessCode: needsCode ? values.accessCode : undefined } : { identifier: values.identifier, password: values.password });
  });

  return (
    <Stack spacing={2} component="form" onSubmit={onSubmit} noValidate>
      {mutation.isError ? (
        <Alert severity="error">
          {mutation.error instanceof Error ? mutation.error.message : "Unable to sign in with this email."}
        </Alert>
      ) : null}
      <TextField
        label={demo ? "Demo email" : "Email or username"}
        type={demo ? "email" : "text"}
        autoComplete="username"
        {...register("identifier")}
        error={Boolean(errors.identifier)}
        helperText={errors.identifier?.message}
      />
      {!demo && <TextField label="Password" type="password" autoComplete="current-password" {...register("password")} error={Boolean(errors.password)} helperText={errors.password?.message} />}
      {demo && needsCode ? (
        <TextField label="Access code" type="password" autoComplete="current-password" {...register("accessCode")} />
      ) : null}
      <Button type="submit" size="large" disabled={isSubmitting || mutation.isPending} fullWidth>
        {mutation.isPending ? "Signing in…" : "Sign in"}
      </Button>
      {config.isError && <Alert severity="warning">Unable to load sign-in options. Password sign-in is available.</Alert>}
      {config.data?.data.demoLoginEnabled && <Button variant="text" disabled={mutation.isPending} onClick={() => { setDemo(!demo); reset(); mutation.reset(); }}>{demo ? "Use password sign-in" : "Demo access"}</Button>}
    </Stack>
  );
}
