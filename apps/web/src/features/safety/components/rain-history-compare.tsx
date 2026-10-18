import AddIcon from "@mui/icons-material/AddOutlined";
import CloudOutlinedIcon from "@mui/icons-material/CloudOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import EngineeringOutlinedIcon from "@mui/icons-material/EngineeringOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { WeatherHour } from "@sts/shared";
import type { ReactNode } from "react";
import { formatThaiDate } from "@/lib/dates.js";
import { useHourlyWeather } from "@/features/weather/index.js";
import type { RainLogEntry } from "../types/rain-log.types.js";

/** An hour counts as rain from this much (mm). */
const RAIN_MM = 0.2;
/** Only working hours matter for stoppage: 06:00–20:00. */
const DAY_FROM = 6;
const DAY_TO = 20;

interface RecordedSpan { date: string; start: string; end: string; hours: number; mm: number }

const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;
const bangkok = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 7 * 3_600_000);
  return { date: d.toISOString().slice(0, 10), hour: d.getUTCHours() };
};

// Consecutive recorded rain hours inside working hours → one row per rain period, newest first.
function recordedSpans(hours: WeatherHour[]): RecordedSpan[] {
  const spans: RecordedSpan[] = [];
  let cur: RecordedSpan | null = null;
  let last: { date: string; hour: number } | null = null;
  for (const h of hours) {
    const t = bangkok(h.hour);
    const wet = (h.precipitationMm ?? 0) >= RAIN_MM && t.hour >= DAY_FROM && t.hour < DAY_TO;
    const continues = cur && last && last.date === t.date && last.hour + 1 === t.hour;
    if (wet && cur && continues) {
      cur.end = pad(t.hour + 1);
      cur.hours += 1;
      cur.mm += h.precipitationMm ?? 0;
    } else if (wet) {
      if (cur) spans.push(cur);
      cur = { date: t.date, start: pad(t.hour), end: pad(t.hour + 1), hours: 1, mm: h.precipitationMm ?? 0 };
    } else if (cur) {
      spans.push(cur);
      cur = null;
    }
    last = t;
  }
  if (cur) spans.push(cur);
  return spans.map((s) => ({ ...s, mm: Math.round(s.mm * 10) / 10 })).reverse();
}

// Rain history side by side for the selected dates: what the weather service recorded (left) and
// what EPS logged on site (right), so a missing or extra entry stands out by looking across.
export function RainHistoryCompare({
  projectId,
  from,
  to,
  logs,
  onAdd,
  onEdit,
  onDelete,
}: {
  projectId: string | null;
  from: string;
  to: string;
  logs: RainLogEntry[];
  onAdd: () => void;
  onEdit: (entry: RainLogEntry) => void;
  onDelete: (entry: RainLogEntry) => void;
}) {
  const weather = useHourlyWeather(projectId, from, to);
  const spans = recordedSpans(weather.data?.data.hours ?? []);
  const recordedHours = spans.reduce((s, x) => s + x.hours, 0);
  const loggedHours = Math.round(logs.reduce((s, l) => s + (l.stoppageHours || 0), 0) * 10) / 10;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, lg: 6 }}>
        <Side
          icon={<CloudOutlinedIcon color="info" />}
          title="ข้อมูลอุตุนิยมวิทยา (Open-Meteo)"
          note={`ฝนตกช่วงเวลาทำงาน ${pad(DAY_FROM)}–${pad(DAY_TO)} · ${spans.length} ครั้ง · รวม ${recordedHours} ชม.`}
        >
          {weather.isLoading ? (
            <Skeleton variant="rounded" height={160} />
          ) : spans.length === 0 ? (
            <Empty text="ไม่มีฝนในเวลาทำงานช่วงนี้" />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <Th>วันที่</Th>
                  <Th>ช่วงเวลาฝนตก</Th>
                  <Th>ระยะเวลา</Th>
                  <Th align="right">ปริมาณฝน</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {spans.map((s) => (
                  <TableRow key={s.date + s.start} hover>
                    <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>{formatThaiDate(s.date)}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {s.start} – {s.end} น.
                    </TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined" color="info" label={`${s.hours} ชม.`} />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                      {s.mm} mm
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Side>
      </Grid>

      <Grid size={{ xs: 12, lg: 6 }}>
        <Side
          icon={<EngineeringOutlinedIcon color="primary" />}
          title="ข้อมูลจากการกรอกด้วย EPS (Actual)"
          note={`ฝนตกจนหยุดงานหน้างาน · ${logs.length} ครั้ง · หยุดงานรวม ${loggedHours} ชม.`}
          action={
            <Button variant="outlined" startIcon={<AddIcon />} onClick={onAdd} sx={{ whiteSpace: "nowrap" }}>
              บันทึกฝนตก
            </Button>
          }
        >
          {logs.length === 0 ? (
            <Empty text="EPS ยังไม่ได้บันทึกฝนตกช่วงนี้" />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <Th>วันที่</Th>
                  <Th>ช่วงเวลาฝนตก</Th>
                  <Th>หยุดงาน</Th>
                  <Th>รายละเอียด</Th>
                  <Th align="right"> </Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap", fontWeight: 600 }}>{formatThaiDate(l.date)}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {l.startTime} – {l.endTime} น.
                    </TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined" color="error" label={`${l.stoppageHours} ชม.`} />
                    </TableCell>
                    <TableCell sx={{ minWidth: 160 }}>
                      <Typography variant="body2" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }} title={l.impactSummary}>
                        {l.impactSummary || "—"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {l.recordedBy}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <IconButton size="small" aria-label="แก้ไข" onClick={() => onEdit(l)}>
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" aria-label="ลบ" color="error" onClick={() => onDelete(l)}>
                        <DeleteOutlineOutlinedIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Side>
      </Grid>
    </Grid>
  );
}

function Side({ icon, title, note, action, children }: { icon: ReactNode; title: string; note: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", p: 2, height: "100%" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          {icon}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              {title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {note}
            </Typography>
          </Box>
        </Stack>
        {action}
      </Stack>
      <Box sx={{ overflowX: "auto" }}>{children}</Box>
    </Box>
  );
}

function Th({ children, align }: { children: ReactNode; align?: "right" }) {
  return (
    <TableCell align={align} sx={{ fontWeight: 700, bgcolor: "grey.50", whiteSpace: "nowrap" }}>
      {children}
    </TableCell>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <Box sx={{ py: 4, textAlign: "center", border: 1, borderStyle: "dashed", borderColor: "divider", borderRadius: 1.5 }}>
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Box>
  );
}
