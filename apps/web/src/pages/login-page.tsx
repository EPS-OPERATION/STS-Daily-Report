import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { LoginForm } from "@/features/auth/components/login-form.js";

export function LoginPage() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 400,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          p: { xs: 3, sm: 4 },
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: "#FFFFFF",
              border: "1px solid",
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 0.5,
              flexShrink: 0,
            }}
          >
            <Box
              component="img"
              src="/brand/logo-eps.png"
              alt="EPS"
              sx={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </Box>
          <Box>
            <Typography variant="h5">STS Platform</Typography>
            <Typography variant="caption" color="text.secondary">
              Construction Operations
            </Typography>
          </Box>
        </Stack>
        <Typography variant="h4" sx={{ mb: 0.5 }}>
          Sign in
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Use your work email to access the platform
        </Typography>
        <LoginForm />
      </Box>
    </Box>
  );
}
