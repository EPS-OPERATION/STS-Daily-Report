import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatNumber } from "@/lib/format.js";
import { HttpError } from "@/services/http/client.js";
import { useSafetyBaseline, useSafetyBaselineVersions, useSaveSafetyBaseline } from "../hooks/use-safety.js";

const iso = (d: Dayjs | null) => (d?.isValid() ? d.format("YYYY-MM-DD") : null);
const hoursText = (n: number) => (Number.isFinite(n) ? String(Math.round(n * 10) / 10) : "");

// What happened on the project BEFORE the app was used. EPS often does not know the exact figures from the first
// day, so this is one small record, set once and correctable any time; everything the contractors report afterwards
// keeps adding on top of it by itself:
//   Total man-hours = hours before the app + hours counted from reports and EPS entries
//   Last LTI        = the later of this date and any LTI reported since (it also restarts the safety clock)
// The total is typed as "the whole project's hours up to <date>" — the figure EPS can estimate; the server works out how
// much of it is "before the app" by taking away what the app has counted up to that date.
export function SafetyBaselineSection({ projectId, asOf, name, open }: { projectId: string | null; asOf: string; name: string; open: boolean }) {
  const info = useSafetyBaseline(projectId, asOf, open);
  const versions = useSafetyBaselineVersions(projectId, open);
  const save = useSaveSafetyBaseline(projectId);
  const [start, setStart] = useState<Dayjs | null>(null);
  const [lastLti, setLastLti] = useState<Dayjs | null>(null);
  const [total, setTotal] = useState("");
  const data = info.data?.data;

  // Show the saved record (and the total as of the chosen date) whenever it is loaded or the date changes.
  useEffect(() => {
    if (!data) return;
    setStart(data.projectStartDate ? dayjs(data.projectStartDate) : null);
    setLastLti(data.lastLtiDate ? dayjs(data.lastLtiDate) : null);
    setTotal(hoursText(data.totalHours));
  }, [data?.asOf, data?.updatedAt, data?.totalHours]); // eslint-disable-line react-hooks/exhaustive-deps

  const asOfLabel = dayjs(asOf).format("D MMM YYYY");
  const typed = Number(total);
  const totalChanged = data ? Math.abs(typed - data.totalHours) > 0.04 : false;
  const startChanged = data ? iso(start) !== data.projectStartDate : false;
  const ltiChanged = data ? iso(lastLti) !== data.lastLtiDate : false;
  const tooLow = data && Number.isFinite(typed) && typed < data.countedHours;
  const before = data && Number.isFinite(typed) ? Math.max(0, typed - data.countedHours) : null;
  const error = save.error instanceof HttpError ? save.error.message : null;
  const canSave = Boolean(name.trim()) && Boolean(data) && (totalChanged || startChanged || ltiChanged) && !tooLow && Number.isFinite(typed) && typed >= 0 && !save.isPending;

  const submit = () => {
    if (!canSave) return;
    save.mutate(
      {
        confirmedName: name.trim(),
        ...(totalChanged ? { totalManHours: { value: typed, asOf } } : {}),
        ...(startChanged ? { projectStartDate: iso(start) } : {}),
        ...(ltiChanged ? { lastLtiDate: iso(lastLti) } : {}),
      },
      { onSuccess: () => toast.success("บันทึกข้อมูลก่อนเริ่มใช้ระบบ + ประวัติแล้ว") },
    );
  };

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 1.5, bgcolor: "background.default" }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>ข้อมูลก่อนเริ่มใช้ระบบ (ตั้งครั้งเดียว · แก้ภายหลังได้)</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        ไม่ทราบตัวเลขตั้งแต่เริ่มโครงการก็ใส่ค่าโดยประมาณได้ — รายงานของผู้รับเหมาที่เข้ามาใหม่จะนับต่อให้เองทุกวัน
      </Typography>
      {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
      <Stack spacing={1.75}>
        <DatePicker
          label="วันเริ่มโครงการ (ไม่ทราบ = เว้นว่าง)"
          value={start}
          onChange={setStart}
          maxDate={dayjs()}
          format="D MMM YYYY"
          slotProps={{ field: { clearable: true }, textField: { size: "small", fullWidth: true } }}
        />
        <Box>
          <TextField
            label={`ชั่วโมงทำงานรวมทั้งโครงการ ถึง ${asOfLabel} (Hrs.)`}
            size="small"
            fullWidth
            type="number"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            error={Boolean(tooLow)}
            slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
          />
          <Typography variant="caption" color={tooLow ? "error" : "text.secondary"} sx={{ display: "block", mt: 0.5 }}>
            {!data
              ? "กำลังโหลด…"
              : tooLow
                ? `ระบบนับจากรายงานได้ ${formatNumber(data.countedHours)} ชม. แล้ว — รวมทั้งโครงการต้องไม่ต่ำกว่านี้`
                : `ระบบนับจากรายงานได้ ${formatNumber(data.countedHours)} ชม. → ก่อนเริ่มใช้ระบบ ${formatNumber(before ?? 0)} ชม.`}
          </Typography>
        </Box>
        <DatePicker
          label="Last Accident (LTI) ก่อนเริ่มใช้ระบบ (ไม่เคยมี = เว้นว่าง)"
          value={lastLti}
          onChange={setLastLti}
          maxDate={dayjs()}
          format="D MMM YYYY"
          slotProps={{ field: { clearable: true }, textField: { size: "small", fullWidth: true } }}
        />
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Button variant="outlined" onClick={submit} disabled={!canSave}>
            {save.isPending ? "กำลังบันทึก…" : "บันทึกข้อมูลก่อนเริ่มใช้ระบบ"}
          </Button>
          <Typography variant="caption" color="text.secondary">
            {!name.trim() ? "ใส่ชื่อผู้แก้ไขด้านล่างก่อน" : data?.updatedAt ? `แก้ล่าสุดโดย ${data.confirmedName ?? "—"} · ${dayjs(data.updatedAt).format("D MMM YYYY HH:mm")}` : "ยังไม่เคยตั้งค่า"}
          </Typography>
        </Stack>
        {versions.data?.data.length ? (
          <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1, "&:before": { display: "none" } }}>
            <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon />}>
              <Typography variant="body2">ประวัติการแก้ไข ({versions.data.data.length})</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Stack spacing={0.75}>
                {[...versions.data.data].reverse().map((v) => (
                  <Box key={v.version} sx={{ border: 1, borderColor: "divider", borderRadius: 1, px: 1.25, py: 0.75 }}>
                    <Stack direction="row" spacing={1} alignItems="baseline" flexWrap="wrap" useFlexGap>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>v{v.version}</Typography>
                      <Typography variant="caption">{v.confirmedName ?? v.accountName ?? v.account ?? "—"}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ ml: "auto", fontVariantNumeric: "tabular-nums" }}>
                        {dayjs(v.createdAt).format("DD/MM/YYYY HH:mm:ss")}
                      </Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      เริ่มโครงการ {v.snapshot.projectStartDate ? dayjs(v.snapshot.projectStartDate).format("D MMM YYYY") : "—"} · LTI ล่าสุด{" "}
                      {v.snapshot.lastLtiDate ? dayjs(v.snapshot.lastLtiDate).format("D MMM YYYY") : "—"} · ก่อนเริ่มใช้ระบบ {formatNumber(v.snapshot.manHoursBefore)} ชม.
                      {v.snapshot.enteredTotal ? ` (กรอกรวม ${formatNumber(v.snapshot.enteredTotal.value)} ชม. ถึง ${dayjs(v.snapshot.enteredTotal.asOf).format("D MMM YYYY")})` : ""}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        ) : null}
      </Stack>
    </Box>
  );
}
