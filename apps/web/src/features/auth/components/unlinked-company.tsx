import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useLinkRequest } from "../hooks/use-link-request.js";
import { ContractorPicker } from "./contractor-picker.js";

// Approved account without a contractor membership: the user picks their company and
// EPS approves the link from the pending queue in /admin/users.
export function UnlinkedCompany() {
  const mutation = useLinkRequest();
  const [contractorId, setContractorId] = useState("");
  if (mutation.isSuccess) {
    return (
      <Box sx={{ maxWidth: 600, mx: "auto", py: 4 }}>
        <Typography variant="h4" sx={{ mb: 2 }}>ส่งคำขอแล้ว</Typography>
        <Alert severity="success">ส่งคำขอเชื่อมโยงผู้รับเหมาแล้ว รอผู้ดูแลระบบ (EPS) อนุมัติ</Alert>
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Your request is waiting for EPS approval. You will be able to submit daily reports once your company is linked.
        </Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ maxWidth: 600, mx: "auto", py: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Account approved</Typography>
      <Alert severity="info">บัญชีได้รับการอนุมัติแล้ว แต่ยังไม่ได้เชื่อมโยงกับผู้รับเหมา — เลือกผู้รับเหมาที่คุณทำงานด้วย แล้วส่งคำขอเพื่อให้ EPS อนุมัติ</Alert>
      <Stack spacing={2} sx={{ mt: 2 }}>
        {mutation.isError && <Alert severity="error">{mutation.error.message}</Alert>}
        <ContractorPicker value={contractorId} onChange={setContractorId} allowOther={false} disabled={mutation.isPending} />
        <Button variant="contained" disabled={!contractorId || mutation.isPending} onClick={() => mutation.mutate(contractorId)}>
          {mutation.isPending ? "Sending…" : "ขอเชื่อมโยงผู้รับเหมา"}
        </Button>
      </Stack>
    </Box>
  );
}
