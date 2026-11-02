import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

// Approved account without a contractor membership. Linking is a one-step admin action
// on /admin/users (Active tab → Link) — the user waits here until then.
export function UnlinkedCompany() {
  return (
    <Box sx={{ maxWidth: 600, mx: "auto", py: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Account approved</Typography>
      <Alert severity="info">บัญชีได้รับการอนุมัติแล้ว แต่ยังไม่ได้เชื่อมโยงกับผู้รับเหมา กรุณาติดต่อผู้ดูแลระบบ (admin) เพื่อผูกผู้รับเหมาให้</Alert>
      <Typography color="text.secondary" sx={{ mt: 2 }}>
        Your account is active. Ask an EPS administrator to link your company on the user management page before submitting daily reports.
      </Typography>
    </Box>
  );
}
