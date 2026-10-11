import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { checkPassword } from "@sts/shared";
import type { ReactNode } from "react";

function Rule({ met, children }: { met: boolean; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: met ? "success.main" : "text.disabled" }}>
      <CheckOutlinedIcon sx={{ fontSize: 18 }} aria-hidden="true" />
      <Typography variant="body2" sx={{ color: "inherit" }}>
        {children}
      </Typography>
    </Stack>
  );
}

// Live checklist mirroring checkPassword (@sts/shared) — used on the register and
// reset-password forms so the rule the API enforces is visible while typing.
export function PasswordRequirements({ password }: { password: string }) {
  const checks = checkPassword(password);
  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
        Your password must contain:
      </Typography>
      <Stack spacing={0.75}>
        <Rule met={checks.length}>At least 8 characters</Rule>
        <Box>
          <Rule met={checks.classRequirement}>At least 3 of the following:</Rule>
          <Stack spacing={0.5} sx={{ pl: 3.5, mt: 0.5 }}>
            <Rule met={checks.lower}>Lowercase letters (a-z)</Rule>
            <Rule met={checks.upper}>Uppercase letters (A-Z)</Rule>
            <Rule met={checks.digit}>Numbers (0-9)</Rule>
            <Rule met={checks.special}>Special characters (e.g. !@#$%^&amp;*)</Rule>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
