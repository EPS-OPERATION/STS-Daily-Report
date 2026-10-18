import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import type { UseReviewDialogState } from "../hooks/use-review-dialog.js";

export function ReviewSafetyTab({ ed }: { ed: UseReviewDialogState }) {
  const { data } = ed;
  if (!data) return null;
  return (
    <Stack spacing={2}>
      <Card variant="outlined">
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            สถิติความปลอดภัยและการเกิดอุบัติเหตุ
          </Typography>
          {data.accidentOccurred ? (
            <Alert severity="error">
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                เกิดอุบัติเหตุหรือเหตุการณ์ผิดปกติ
              </Typography>
              <Typography variant="caption">{data.accidentNote || "ไม่มีรายละเอียดเพิ่มเติม"}</Typography>
            </Alert>
          ) : (
            <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                ปลอดภัย ไม่เกิดอุบัติเหตุในรอบวัน (Zero Accident)
              </Typography>
              <Typography variant="caption">การปฏิบัติงานเป็นไปตามมาตรฐานความปลอดภัย</Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            การลงนามรับรองรายงาน (Sign-off)
          </Typography>
          <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              ผู้จัดทำรายงาน: {data.signatureName || "นายสมศักดิ์ มั่นคง (ผู้จัดการหน้างาน)"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              สถานะการส่ง: ส่งรายงานครบถ้วน
              {data.signedAt ? ` · บันทึกเวลา ${dayjs(data.signedAt).format("DD/MM/YYYY HH:mm น.")}` : ""}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
