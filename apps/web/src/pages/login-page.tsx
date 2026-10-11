import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { LoginForm } from "@/features/auth/components/login-form.js";
import { RegisterForm } from "@/features/auth/components/register-form.js";
import { AuthShell } from "@/features/auth/components/auth-shell.js";

export function LoginPage() {
  const [tab, setTab] = useState(0);
  return (
    <AuthShell>
      <Tabs value={tab} onChange={(_, value: number) => setTab(value)} variant="fullWidth" aria-label="Account access" sx={{ mb: 1.5 }}>
        <Tab label="Sign in" id="sign-in-tab" aria-controls="sign-in-panel" /><Tab label="Create account" id="create-account-tab" aria-controls="create-account-panel" />
      </Tabs>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {tab === 0 ? "Sign in with your email or username" : "Request access for your contractor company"}
      </Typography>
      <div role="tabpanel" id={tab === 0 ? "sign-in-panel" : "create-account-panel"} aria-labelledby={tab === 0 ? "sign-in-tab" : "create-account-tab"}>
        {tab === 0 ? <LoginForm /> : <RegisterForm onBack={() => setTab(0)} />}
      </div>
    </AuthShell>
  );
}
