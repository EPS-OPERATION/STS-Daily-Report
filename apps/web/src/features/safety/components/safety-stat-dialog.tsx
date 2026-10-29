import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { ACCIDENT_CATEGORIES, type AccidentCategory } from "@sts/shared";
import dayjs from "dayjs";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { FormDialog } from "@/components/ui/form-dialog.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { useMe } from "@/features/auth/index.js";
import { formatThaiDate, todayIso } from "@/lib/dates.js";
import { formatNumber } from "@/lib/format.js";
import { HttpError } from "@/services/http/client.js";
import { useSafetyStatEntries, useSafetyStatVersions, useSaveSafetyStat } from "../hooks/use-safety.js";
import type { SafetyStats, SafetyStatEntry, SafetyStatInput } from "../types/safety.types.js";
import { SafetyBaselineSection } from "./safety-baseline-section.js";
import { statusOf } from "./statistic-table.js";

// Same palette as the STATISTIC table (mirror of the paper EPS Safety Weekly Report).
const BLUE = "#5bc8f2";
const INK = "#0b1fd1";
const GREEN = "#127a2b";

const FIELD_OF: Record<AccidentCategory, keyof SafetyStatInput> = {
  lti: "lti",
  non_lti: "nonLti",
  property_damage: "propertyDamage",
  near_miss: "nearMiss",
  emergency: "emergency",
};

// Editable cells in render order — the grid the cursor walks (↑/↓/←/→ and Tab). Each category row has
// its daily count and its hand-written year total; indices are assigned at each render site so keyboard
// navigation follows what the eye sees.
const GRID = [
  "lti",
  "lti.year",
  "nonLti",
  "nonLti.year",
  "propertyDamage",
  "propertyDamage.year",
  "nearMiss",
  "nearMiss.year",
  "emergency",
  "emergency.year",
  "daysWithoutAccident",
  "highestDaysWithoutAccident",
  "inspections",
  "manHours",
] as const;

// Exported for the STATISTIC table's inline editing (same entry shape as this dialog).
export const emptyStatInput = (date: string): SafetyStatInput => ({
  date,
  nearMiss: 0,
  inspections: 0,
  lti: 0,
  nonLti: 0,
  propertyDamage: 0,
  emergency: 0,
  manHours: 0,
  daysWithoutAccident: null,
  highestDaysWithoutAccident: null,
  note: "",
});

export const statInputOf = (e: SafetyStatEntry): SafetyStatInput => ({
  date: e.entryDate,
  nearMiss: e.nearMiss,
  inspections: e.inspections,
  lti: e.lti,
  nonLti: e.nonLti,
  propertyDamage: e.propertyDamage,
  emergency: e.emergency,
  manHours: e.manHours,
  daysWithoutAccident: e.daysWithoutAccident,
  highestDaysWithoutAccident: e.highestDaysWithoutAccident,
  note: e.note ?? "",
});

// A single spreadsheet cell: click to select (content is selected so typing overwrites), Tab / arrow
// keys walk to the neighbouring cell, Enter commits the save.
function CellNumber({
  value,
  onChange,
  step = 1,
  max = 5000,
  nullable = false,
  inputRef,
  onKeyDown,
}: {
  value: number | null;
  onChange: (n: number | null) => void;
  step?: number;
  max?: number;
  nullable?: boolean;
  inputRef?: (el: HTMLInputElement | null) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <TextField
      type="number"
      variant="standard"
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        if (nullable && raw === "") return onChange(null);
        onChange(Math.min(max, Math.max(0, Number(raw) || 0)));
      }}
      inputRef={inputRef}
      onKeyDown={onKeyDown}
      onFocus={(e) => e.currentTarget.select()}
      slotProps={{
        input: { disableUnderline: true },
        htmlInput: { min: 0, max, step, style: { textAlign: "center", fontWeight: 700, padding: "2px 0", fontSize: "inherit" } },
      }}
      sx={{
        width: 88,
        "& .MuiInputBase-root": { fontSize: "inherit", bgcolor: "#FFFFFF", px: 0.5 },
        // Excel-style active cell: blue ring + pale fill.
        "& .MuiInputBase-root.Mui-focused": {
          bgcolor: "#eaf3ff",
          outline: "2px solid #0b1fd1",
          outlineOffset: -2,
        },
      }}
    />
  );
}

// Append-only history of one stat entry, newest first.
function StatHistory({ projectId, entryId }: { projectId: string; entryId: string }) {
  const versions = useSafetyStatVersions(projectId, entryId);
  if (versions.isLoading) return <BlockSkeleton height={100} />;
  if (versions.isError) return <Typography variant="caption" color="error">โหลดประวัติไม่สำเร็จ</Typography>;
  const rows = [...(versions.data?.data ?? [])].reverse();
  if (!rows.length) {
    return <Typography variant="caption" color="text.secondary">ยังไม่มีประวัติ — เริ่มเก็บตั้งแต่การบันทึกครั้งถัดไป</Typography>;
  }
  return (
    <Stack spacing={0.75}>
      {rows.map((v) => (
        <Box key={v.version} sx={{ border: 1, borderColor: "divider", borderRadius: 1, px: 1.25, py: 0.75 }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>v{v.version}</Typography>
            <Chip size="small" variant="outlined" label={v.action === "create" ? "เพิ่มใหม่" : "แก้ไข"} />
            {v.confirmedName ? <Typography variant="caption">ยืนยันโดย <b>{v.confirmedName}</b></Typography> : null}
            <Typography variant="caption" color="text.secondary" sx={{ ml: "auto", fontVariantNumeric: "tabular-nums" }}>
              {dayjs(v.createdAt).format("DD/MM/YYYY HH:mm:ss")}
            </Typography>
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}

// EPS manual entry for a day with no contractor report, edited directly on the STATISTIC table as a
// spreadsheet: click a cell to select it, type to overwrite, Tab / arrows move between cells, Enter
// saves. Every save appends an append-only version with the confirmer's typed name.
export function SafetyStatDialog({
  projectId,
  stats,
  open,
  onClose,
}: {
  projectId: string | null;
  stats: SafetyStats | null;
  open: boolean;
  onClose: () => void;
}) {
  const [date, setDate] = useState(todayIso());
  const [v, setV] = useState<SafetyStatInput>(() => emptyStatInput(todayIso()));
  const [yearV, setYearV] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const me = useMe();
  const entries = useSafetyStatEntries(projectId, date, date);
  const save = useSaveSafetyStat(projectId);
  const existing = entries.data?.data?.[0] ?? null;

  // Spreadsheet cursor: one ref per editable cell, in render order (see GRID).
  const cellRefs = useRef<(HTMLInputElement | null)[]>([]);
  const bindRef = (i: number) => (el: HTMLInputElement | null) => {
    cellRefs.current[i] = el;
  };
  const focusCell = (i: number) => cellRefs.current[((i % GRID.length) + GRID.length) % GRID.length]?.focus();

  useEffect(() => {
    if (!open) return;
    setDate(todayIso());
    setV(emptyStatInput(todayIso()));
    setTouched(false);
  }, [open]);

  useEffect(() => {
    if (!open || !entries.isSuccess) return;
    setV(baseInput(entries.data?.data?.[0] ?? null, date));
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date, entries.isSuccess, entries.data]);

  useEffect(() => {
    if (open && !name) setName(me.data?.data.user.displayName?.trim() ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, me.data]);

  // Year column prefill: what the STATISTIC table currently shows (override or computed).
  useEffect(() => {
    if (!open) return;
    setYearV(Object.fromEntries(ACCIDENT_CATEGORIES.map((c) => [c.code, stats?.categories.find((x) => x.code === c.code)?.year ?? 0])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stats]);

  const set = <K extends keyof SafetyStatInput>(key: K, value: SafetyStatInput[K]) =>
    setV((s) => ({ ...s, [key]: value }));

  // What the table shows before the user touches it: the saved entry when there is one, otherwise
  // what the form currently says (stats as of its period end).
  function baseInput(entry: SafetyStatEntry | null, d: string): SafetyStatInput {
    return {
      ...(entry ? statInputOf(entry) : emptyStatInput(d)),
      daysWithoutAccident: (entry ? entry.daysWithoutAccident : stats?.daysWithoutAccident) ?? null,
      highestDaysWithoutAccident: (entry ? entry.highestDaysWithoutAccident : stats?.highestDaysWithoutAccident) ?? null,
    };
  }

  const saveError = save.error instanceof HttpError ? save.error : null;
  const loadError = entries.error instanceof HttpError ? entries.error : null;
  const busy = save.isPending || entries.isFetching;
  const dateLabel = dayjs(date).format("D MMM YYYY");
  const year = stats?.to.slice(0, 4) ?? dayjs(date).format("YYYY");

  // What the form currently shows in the Year column (override or computed) — the «before» side.
  const statsYear = (code: string) => stats?.categories.find((x) => x.code === code)?.year ?? 0;
  // Only categories whose year total EPS actually changed are sent; the rest keep computing live.
  const yearValues = ACCIDENT_CATEGORIES
    .filter((c) => Number(yearV[c.code] ?? statsYear(c.code)) !== statsYear(c.code))
    .map((c) => ({ code: c.code, value: Number(yearV[c.code] ?? statsYear(c.code)) }));

  const submit = () => {
    setTouched(true);
    if (!projectId || !name.trim()) return;
    save.mutate(
      {
        ...v,
        date,
        note: v.note?.trim() || null,
        confirmedName: name.trim(),
        yearValues: yearValues.length ? yearValues : undefined,
      },
      {
        onSuccess: () => {
          toast.success(existing ? "บันทึกการแก้ไข + ประวัติแล้ว" : "บันทึกสถิติ + ประวัติแล้ว");
          onClose();
        },
      },
    );
  };

  const cellKeyDown = (i: number) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      focusCell(i + 1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      focusCell(i - 1);
    } else if (e.key === "Tab") {
      e.preventDefault();
      focusCell(e.shiftKey ? i - 1 : i + 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  const cell = { border: "1px solid #3a3a3a", padding: "6px 10px" } as const;
  const headCell = { bgcolor: BLUE, color: INK, fontWeight: 700 } as const;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      busy={save.isPending}
      maxWidth="sm"
      dividers
      mobileFullScreen
      title={
        <Stack spacing={0.25}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
            {existing ? "แก้ไขสถิติความปลอดภัย (EPS)" : "เพิ่มสถิติความปลอดภัย (EPS)"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ใช้เมื่อผู้รับเหมาไม่มีรายงาน · คลิกช่องเพื่อแก้ · ลูกศร/Tab เลื่อนช่อง · Enter บันทึก
          </Typography>
        </Stack>
      }
      actions={
        <>
          <Button color="inherit" variant="outlined" onClick={onClose} disabled={save.isPending}>
            ยกเลิก
          </Button>
          <Button variant="contained" onClick={submit} disabled={busy || !name.trim()}>
            {save.isPending ? "กำลังบันทึก…" : "บันทึกสถิติ"}
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        {loadError ? <Alert severity="error">โหลดข้อมูลไม่สำเร็จ: {loadError.message}</Alert> : null}
        {saveError ? <Alert severity="error">บันทึกไม่สำเร็จ: {saveError.message}</Alert> : null}
        {touched && !v.date ? <Alert severity="warning">เลือกวันที่</Alert> : null}

        <DatePicker
          label="วันที่"
          value={dayjs(date)}
          onChange={(next) => {
            const iso = next?.isValid() ? next.format("YYYY-MM-DD") : null;
            if (!iso) return;
            setDate(iso);
            setV(baseInput(null, iso));
            setTouched(false);
          }}
          maxDate={dayjs()}
          format="D MMM YYYY"
          slotProps={{ textField: { size: "small", fullWidth: true } }}
        />

        <Typography variant="caption" color="text.secondary">
          {formatThaiDate(date)} · {existing ? "มีข้อมูลแล้ว แก้ไขได้" : "ยังไม่มีข้อมูล"} · ค่ารวมทั้งปีจะอัปเดตหลังบันทึก ·
          วันสะสมจะนับต่อทุกวันจากค่าล่าสุดที่บันทึก
        </Typography>

        <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 13, "& td, & th": cell, "& th": headCell }}>
          <thead>
            <tr>
              <th style={{ width: "44%" }}>Categories</th>
              <th>{dateLabel}</th>
              <th>Year {year}</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ACCIDENT_CATEGORIES.map((c, i) => {
              const field = FIELD_OF[c.code];
              const yearCount = Number(yearV[c.code] ?? statsYear(c.code));
              const { emoji, label: ariaLabel } = statusOf(c.code, yearCount);
              const current = Number(v[field]);
              return (
                <tr key={c.code}>
                  <td style={{ color: GREEN, fontWeight: 600 }}>
                    {i + 1}. {c.label}
                  </td>
                  <td style={{ textAlign: "center", padding: "4px 6px" }}>
                    <CellNumber
                      value={current}
                      onChange={(n) => set(field, n as never)}
                      inputRef={bindRef(i * 2)}
                      onKeyDown={cellKeyDown(i * 2)}
                    />
                  </td>
                  <td style={{ textAlign: "center", padding: "4px 6px" }}>
                    <CellNumber
                      value={yearCount}
                      onChange={(n) => setYearV((y) => ({ ...y, [c.code]: n ?? 0 }))}
                      max={100_000}
                      inputRef={bindRef(i * 2 + 1)}
                      onKeyDown={cellKeyDown(i * 2 + 1)}
                    />
                  </td>
                  <td style={{ textAlign: "center", fontSize: 17 }} aria-label={ariaLabel}>
                    {emoji}
                  </td>
                </tr>
              );
            })}
            <tr>
              <td colSpan={4} style={{ color: GREEN, fontWeight: 600 }}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Box component="span" sx={{ flex: 1 }}>
                    Days Without an Accident (accumulate) :
                  </Box>
                  <CellNumber
                    value={v.daysWithoutAccident ?? null}
                    onChange={(n) => set("daysWithoutAccident", n)}
                    max={20000}
                    nullable
                    inputRef={bindRef(10)}
                    onKeyDown={cellKeyDown(10)}
                  />
                  <Box component="span" sx={{ color: INK }}>Days</Box>
                </Stack>
              </td>
            </tr>
            <tr>
              <td colSpan={4} style={{ color: GREEN, fontWeight: 600 }}>
                <Stack direction="row" alignItems="center" gap={1}>
                  <Box component="span" sx={{ flex: 1 }}>
                    Highest Days Without Accident :
                  </Box>
                  <CellNumber
                    value={v.highestDaysWithoutAccident ?? null}
                    onChange={(n) => set("highestDaysWithoutAccident", n)}
                    max={20000}
                    nullable
                    inputRef={bindRef(11)}
                    onKeyDown={cellKeyDown(11)}
                  />
                  <Box component="span" sx={{ color: INK }}>Days</Box>
                </Stack>
              </td>
            </tr>
            <tr>
              <td colSpan={4} style={{ background: BLUE, color: INK }}>
                Last Accident Loss Time Injury : {stats?.lastLti ? dayjs(stats.lastLti).format("D MMM YYYY") : "-"}
              </td>
            </tr>
            <tr>
              <td colSpan={4} style={{ background: BLUE, color: INK }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                  <span>Safety Inspection ({dateLabel}) :</span>
                  <CellNumber
                    value={Number(v.inspections)}
                    onChange={(n) => set("inspections", n ?? 0)}
                    inputRef={bindRef(12)}
                    onKeyDown={cellKeyDown(12)}
                  />
                </Stack>
              </td>
            </tr>
            <tr>
              <td colSpan={4} style={{ background: BLUE, color: INK }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                  <span>Manhour record ({dateLabel}) :</span>
                  <CellNumber
                    value={Number(v.manHours)}
                    onChange={(n) => set("manHours", n ?? 0)}
                    step={0.5}
                    max={10_000_000}
                    inputRef={bindRef(13)}
                    onKeyDown={cellKeyDown(13)}
                  />
                </Stack>
              </td>
            </tr>
            <tr>
              <td colSpan={4} style={{ background: BLUE, color: INK }}>
                Total acc. (Start{stats?.baseline?.projectStartDate ? ` ${dayjs(stats.baseline.projectStartDate).format("D MMM YYYY")}` : ""} – {dateLabel}) : {formatNumber(stats?.manHoursTotal ?? 0)} Hrs.
              </td>
            </tr>
          </tbody>
        </Box>

        <SafetyBaselineSection projectId={projectId} asOf={date} name={name} open={open} />

        <TextField
          label="ชื่อผู้แก้ไข (ลงประวัติ)"
          size="small"
          fullWidth
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          error={touched && !name.trim()}
          helperText={touched && !name.trim() ? "ระบุชื่อผู้แก้ไข" : " "}
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />

        <TextField
          label="หมายเหตุ (ถ้ามี)"
          size="small"
          fullWidth
          multiline
          minRows={2}
          value={v.note ?? ""}
          onChange={(e) => set("note", e.target.value)}
          slotProps={{ htmlInput: { maxLength: 1000 } }}
        />

        {projectId && existing ? (
          <Accordion disableGutters elevation={0} sx={{ border: 1, borderColor: "divider", borderRadius: 1, "&:before": { display: "none" } }}>
            <AccordionSummary expandIcon={<ExpandMoreOutlinedIcon />}>
              <Typography variant="subtitle2">ประวัติการแก้ไข</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <StatHistory projectId={projectId} entryId={existing.id} />
            </AccordionDetails>
          </Accordion>
        ) : null}
      </Stack>
    </FormDialog>
  );
}

