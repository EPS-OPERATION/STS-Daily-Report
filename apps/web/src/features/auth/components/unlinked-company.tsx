import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
export function UnlinkedCompany() {
  return <Box sx={{ maxWidth: 600, mx: "auto", py: 4 }}>
    <Typography variant="h4" sx={{ mb: 2 }}>Account approved</Typography>
    <Alert severity="info">บัญชีได้รับการอนุมัติแล้ว แต่ยังไม่ได้เชื่อมโยงกับผู้รับเหมา กรุณาติดต่อผู้ดูแลระบบ</Alert>
    <Typography color="text.secondary" sx={{ mt: 2 }}>Your account is active. Contact EPS to link your company before submitting daily reports.</Typography>
  </Box>;
}
