import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DISCIPLINES, PERMIT_TYPES, POSITIONS, WEATHER_CONDITIONS, type PermitType } from "@sts/shared";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  ALL_CONTRACTORS,
  filterSubmissions,
  inspectionTypeLabel,
  isSubmissionFilter,
  overtimeLines,
  overtimeSummary,
  todayIso,
  usePrintReport,
  usePrintReports,
  useReviewQueue,
  type PrintReport,
} from "@/features/daily-reports/index.js";
import { useCurrentProject } from "@/features/projects/index.js";

import { PRINT_BLUE } from "@/components/print/print-tokens.js";
const BLUE = PRINT_BLUE;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Buddhist-era short date as written on the paper form (3/9/69).
function thaiShortDate(iso: string): string {
  const d = dayjs(iso);
  return `${d.date()}/${d.month() + 1}/${String(d.year() + 543).slice(-2)}`;
}

const sumOf = (rows: { headcount: number }[]) => rows.reduce((s, r) => s + r.headcount, 0);

// Printable EPS "Daily Request & Report" (form R003/20260702) filled from the submitted
// morning + evening data, followed by what the paper form has no room for (nationality/sex, NMH,
// tomorrow's requests). Only reported data is printed; one page when it fits.
// Opens the print dialog once data and images have loaded — choose "Save as PDF".
export function DailyReportPrintPage() {
  const { reportId } = useParams();
  const query = usePrintReport(reportId ?? null);
  const printed = useRef(false);
  const r = query.data?.data;

  useEffect(() => {
    if (!r || printed.current) return;
    document.title = `Daily report ${r.contractorCode} ${r.reportDate}`;
    const imgs = Array.from(document.images);
    Promise.all(
      imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((done) => { img.onload = img.onerror = () => done(null); }))),
    ).then(() => {
      printed.current = true;
      setTimeout(() => window.print(), 300);
    });
  }, [r]);

  if (query.isError) {
    return (
      <Stack alignItems="center" sx={{ py: 10 }}>
        <Typography color="error">เปิดรายงานไม่สำเร็จ — ไม่พบรายงานหรือไม่มีสิทธิ์เข้าถึง</Typography>
      </Stack>
    );
  }
  if (!r) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
        <CircularProgress />
        <Typography>กำลังเตรียมรายงาน…</Typography>
      </Stack>
    );
  }

  return (
    <Box sx={{ bgcolor: "#fff", color: "#000", fontFamily: "'Inter', 'Sarabun', sans-serif" }}>
      <PrintStyles />

      <Stack direction="row" spacing={1} className="no-print" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
          ในหน้าต่างพิมพ์ เลือก "Save as PDF" / "บันทึกเป็น PDF"
        </Typography>
      </Stack>

      <ReportSheet r={r} />
    </Box>
  );
}

// One report = form + summary + signatures, flowing onto a second page only when it does not fit.
function ReportSheet({ r }: { r: PrintReport }) {
  return (
    <Box className="sheet">
      <FormSheet r={r} />
      <SummarySheet r={r} />
      <SignatureBlock r={r} />
    </Box>
  );
}

function PrintStyles() {
  return (
    <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        .sheet { break-after: page; font-size: 12px; line-height: 1.3; }
        .sheet:last-child { break-after: auto; }
        .f { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .f td, .f th { border: 1px solid #222; padding: 2px 4px; vertical-align: middle; overflow-wrap: anywhere; }
        .f th { background: ${BLUE}; font-weight: 700; text-align: center; }
        .c { text-align: center; } .b { font-weight: 700; } .blue { background: ${BLUE}; }
        .photo { height: 96px; object-fit: cover; width: 100%; display: block; }
        .gap { height: 6px; }
      `}</style>
  );
}

// Combined R003 export: every sent report among the Submission History rows (same range + filter
// chip + contractor + search as the table), two A4 pages each, one print dialog.
export function DailyReportsBatchPrintPage() {
  const [params] = useSearchParams();
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : todayIso();
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : rawFrom;
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const filterParam = params.get("filter");
  const filter = isSubmissionFilter(filterParam) ? filterParam : "all";
  const contractor = params.get("contractor") || ALL_CONTRACTORS;
  const search = params.get("q") ?? "";
  const current = useCurrentProject();
  const projectId = params.get("projectId") || current.projectId;

  const history = useReviewQueue(projectId, { from, to });
  const ids = useMemo(
    () =>
      filterSubmissions(history.data?.data ?? [], { filter, contractor, search })
        .map((r) => r.id)
        .filter((id): id is string => Boolean(id)),
    [history.data, filter, contractor, search],
  );
  const reports = usePrintReports(ids);
  const done = reports.filter((q) => q.data).length;
  const failed = reports.filter((q) => q.isError).length;
  const ready = Boolean(history.data) && done + failed === ids.length;
  const printed = useRef(false);

  useEffect(() => {
    if (!ready || printed.current || ids.length === 0) return;
    document.title = `Daily reports ${from}${from === to ? "" : `_${to}`}`;
    const imgs = Array.from(document.images);
    Promise.all(
      imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = () => r(null); }))),
    ).then(() => {
      printed.current = true;
      setTimeout(() => window.print(), 300);
    });
  }, [ready, ids.length, from, to]);

  if (history.isError) {
    return (
      <Stack alignItems="center" sx={{ py: 10 }}>
        <Typography color="error">โหลดข้อมูลไม่สำเร็จ — ไม่มีสิทธิ์เข้าถึงหรือการเชื่อมต่อขัดข้อง</Typography>
      </Stack>
    );
  }
  if (history.data && ids.length === 0) {
    return (
      <Stack alignItems="center" sx={{ py: 10 }}>
        <Typography>ไม่มีรายงานที่ส่งแล้วในช่วงและตัวกรองที่เลือก</Typography>
      </Stack>
    );
  }
  if (!ready) {
    return (
      <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
        <CircularProgress />
        <Typography>
          กำลังเตรียมรายงาน… {done}/{ids.length}
        </Typography>
      </Stack>
    );
  }

  return (
    <Box sx={{ bgcolor: "#fff", color: "#000", fontFamily: "'Inter', 'Sarabun', sans-serif" }}>
      <PrintStyles />
      <Stack direction="row" spacing={1} className="no-print" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Button onClick={() => window.print()}>Print / Save as PDF</Button>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
          {ids.length} รายงาน{failed > 0 ? ` · โหลดไม่สำเร็จ ${failed} รายงาน` : ""} — ในหน้าต่างพิมพ์ เลือก "Save as PDF"
        </Typography>
      </Stack>
      {reports.map((q) =>
        q.data ? (
          <ReportSheet key={q.data.data.id} r={q.data.data} />
        ) : null,
      )}
    </Box>
  );
}

// R003 layout with only what was reported: tables keep their filled rows, parts with no data are left out.
function FormSheet({ r }: { r: PrintReport }) {
  const w = r.weather;
  const eveningDone = r.eveningStatus === "submitted";
  const operatedDays = r.safetyRecord.daysSinceLastAccident;
  const permitsToday = r.permitsToday;
  const permitWorkers = (type: PermitType) => permitsToday.filter((p) => p.permitType === type).reduce((s, p) => s + p.workers, 0);
  const otherPermits = permitsToday.filter((p) => p.permitType === "other");
  const permitLines = PERMIT_TYPES.filter((p) => p.code !== "other" && permitWorkers(p.code) > 0);
  const activities = r.allocations;
  const forecast = r.forecasts;
  const activityRows = Math.max(activities.length, forecast.length);
  const behind = r.allocations.filter((a) => a.countermeasure);
  const morningTotal = sumOf(r.positions);
  const eveningTotal = eveningDone ? r.eveningHeadcount : 0;
  const hasWeather = Boolean(w) || r.temperatureC !== null || r.humidityPct !== null;
  const hasManpower = morningTotal > 0 || eveningTotal > 0;
  const hasPermits = permitLines.length + otherPermits.length > 0;
  const hasTime = Boolean(r.startTime || r.endTime || r.workHours);
  const otLabel = r.overtime?.length ? overtimeSummary(r).replace(/^OT /, "") : r.otHours ? `${r.otHours} hr.` : null;
  const weatherLabel = WEATHER_CONDITIONS.find((c) => c.code === w)?.label;

  return (
    <Box>
      <table className="f">
        <tbody>
          <tr>
            <td rowSpan={2} style={{ width: "28%" }}>
              {/* logo-eps.png is a 447px square with the mark at x52–388, y184–260: crop the padding. */}
              <div style={{ width: 200, height: 45, overflow: "hidden", position: "relative", margin: "2px 0" }}>
                <img src="/brand/logo-eps.png" alt="EPS" style={{ position: "absolute", width: 266, height: 266, left: -31, top: -110 }} />
              </div>
              <div style={{ fontSize: 10 }}>บริษัทอีโค่ แพลนท์ เซอร์วิสเซส จำกัด</div>
            </td>
            <td rowSpan={2} className="c blue" style={{ width: "34%" }}>
              <div className="b" style={{ fontSize: 18 }}>รายงานประจำวัน</div>
              <div>(Daily Request &amp; Report)</div>
            </td>
            <td className="c b">
              {r.contractorName || r.contractorCode} ({r.contractorCode})
            </td>
          </tr>
          <tr>
            <td className="c">
              {r.disciplines.length ? r.disciplines.join(" · ") : "-"} · {thaiShortDate(r.reportDate)}
            </td>
          </tr>
        </tbody>
      </table>
      <table className="f">
        <tbody>
          <tr>
            <td>Project Name: {r.projectName}</td>
            {hasTime ? (
              <td>
                เวลาทำงาน {r.startTime ?? "-"}–{r.endTime ?? "-"}
                {r.workHours ? ` (${r.workHours} ชม.)` : ""}
              </td>
            ) : null}
            {otLabel ? <td>Total OT: {otLabel}</td> : null}
          </tr>
        </tbody>
      </table>
      <table className="f">
        <tbody>
          <tr>
            {hasWeather ? <td className="c b blue">Weather report during the construction</td> : null}
            <td className="c b blue">สถิติความปลอดภัย (Safety Record)</td>
          </tr>
          <tr>
            {hasWeather ? (
              <td style={{ verticalAlign: "top" }}>
                {weatherLabel ? <div>☑ {weatherLabel}</div> : null}
                {r.temperatureC !== null || r.humidityPct !== null ? (
                  <div>
                    {r.temperatureC !== null ? `อุณหภูมิ ${r.temperatureC}°C` : ""}
                    {r.temperatureC !== null && r.humidityPct !== null ? " · " : ""}
                    {r.humidityPct !== null ? `ความชื้น ${r.humidityPct}%` : ""}
                  </div>
                ) : null}
              </td>
            ) : null}
            <td style={{ verticalAlign: "top" }}>
              <div>
                เกิดอุบัติเหตุมาแล้ว (Last Accident Occurred): <b>{r.safetyRecord.accidents}</b> ครั้ง
              </div>
              <div>
                เราทำงานมาแล้ว (We have operated): <b>{operatedDays}</b> วัน
              </div>
              {r.accidentOccurred !== null ? (
                <div style={{ color: r.accidentOccurred ? "#c00" : undefined }}>
                  วันนี้: {r.accidentOccurred ? `เกิดอุบัติเหตุ — ${r.accidentNote ?? ""}` : "ไม่เกิดอุบัติเหตุ"}
                </div>
              ) : null}
            </td>
          </tr>
        </tbody>
      </table>
      {hasManpower || hasPermits ? (
        // Alone, the manpower or permit box keeps its half width (a full-width table spreads the numbers apart).
        <table className="f" style={{ width: hasManpower && hasPermits ? "100%" : "50%" }}>
          <tbody>
              <tr>
                {hasManpower ? <td className="c b blue">ประเภท/จำนวนผู้ปฏิบัติงาน (Manpower)</td> : null}
                {hasPermits ? <td className="c b blue">Today Work Permit</td> : null}
              </tr>
              <tr>
                {hasManpower ? (
                  <td style={{ verticalAlign: "top", padding: 0 }}>
                    <table className="f" style={{ border: 0 }}>
                      <thead>
                        <tr>
                          <th>ตำแหน่ง</th>
                          {morningTotal > 0 ? <th style={{ width: 56 }}>เช้า</th> : null}
                          {eveningTotal > 0 ? <th style={{ width: 56 }}>บ่าย</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {POSITIONS.filter(
                          (p) =>
                            (morningTotal > 0 && r.positions.some((x) => x.position === p.code)) ||
                            (eveningTotal > 0 && r.eveningPositions.some((x) => x.position === p.code)),
                        ).map((p) => (
                          <tr key={p.code}>
                            <td>{p.labelTh}</td>
                            {morningTotal > 0 ? <td className="c">{r.positions.find((x) => x.position === p.code)?.headcount ?? "-"}</td> : null}
                            {eveningTotal > 0 ? <td className="c">{r.eveningPositions.find((x) => x.position === p.code)?.headcount ?? "-"}</td> : null}
                          </tr>
                        ))}
                        <tr className="b blue">
                          <td>Today manpower</td>
                          {morningTotal > 0 ? <td className="c">{morningTotal}</td> : null}
                          {eveningTotal > 0 ? <td className="c">{eveningTotal}</td> : null}
                        </tr>
                      </tbody>
                    </table>
                  </td>
                ) : null}
                {hasPermits ? (
                  <td style={{ verticalAlign: "top" }}>
                    {permitLines.map((p) => (
                      <div key={p.code}>
                        ☑ {p.label} — {permitWorkers(p.code)} คน
                      </div>
                    ))}
                    {otherPermits.map((p) => (
                      <div key={p.id}>
                        ☑ {p.otherLabel ?? "Other"} — {p.workers} คน
                      </div>
                    ))}
                  </td>
                ) : null}
              </tr>
          </tbody>
        </table>
      ) : null}
      {hasPermits || hasWeather ? (
        <div style={{ fontSize: 10, padding: "1px 0" }}>
          * หากความเร็วลม ≥ 14 mph: หยุดงานที่สูง, งานยก และหากมีฝน 90% / Wet Surfaces หยุดงานที่สูง ยก เชื่อมไฟฟ้า
        </div>
      ) : null}

      {activityRows > 0 ? (
        <table className="f" style={{ marginTop: 4 }}>
          <colgroup>
            <col style={{ width: 42 }} />
            <col />
            <col style={{ width: 38 }} />
            <col style={{ width: 46 }} />
            <col style={{ width: 52 }} />
            <col style={{ width: 52 }} />
            <col style={{ width: 42 }} />
            <col style={{ width: "28%" }} />
            <col style={{ width: 52 }} />
          </colgroup>
          <thead>
            <tr>
              <th colSpan={6}>Today Activities</th>
              <th colSpan={3}>Tomorrow Forecast Activities</th>
            </tr>
            <tr>
              <th>Item</th>
              <th>Description of work done</th>
              <th>คน</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Area</th>
              <th>Item</th>
              <th>Description</th>
              <th>Area</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: activityRows }, (_, i) => {
              const a = activities[i];
              const f = forecast[i];
              const low = a && a.planPercent !== null && (a.actualPercent ?? 0) < a.planPercent;
              return (
                <tr key={i}>
                  <td className="c">{a ? i + 1 : ""}</td>
                  <td>{a?.workDescription ?? ""}</td>
                  <td className="c">{a?.headcount ?? ""}</td>
                  <td className="c">{a && a.planPercent !== null ? `${a.planPercent}%` : ""}</td>
                  <td className="c" style={{ color: low ? "#b45309" : undefined, fontWeight: low ? 700 : undefined }}>
                    {a && a.actualPercent !== null ? `${a.actualPercent}%` : ""}
                  </td>
                  <td className="c">{a?.buildingCode ?? ""}</td>
                  <td className="c">{f ? i + 1 : ""}</td>
                  <td>{f?.description ?? ""}</td>
                  <td className="c">{f?.buildingCode ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : null}
      {behind.length > 0 ? (
        <table className="f">
          <tbody>
            <tr>
              <td className="b" style={{ verticalAlign: "top" }}>
                กรณีไม่ได้ตามแผนงานรายวัน โปรดระบุสาเหตุและแผนแก้ไข (Countermeasure):
                {behind.map((a) => (
                  <div key={a.id} style={{ fontWeight: 400 }}>
                    [{a.buildingCode}] {a.countermeasure}
                  </div>
                ))}
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}

      {r.equipment.length > 0 ? (
        <table className="f" style={{ marginTop: 4 }}>
          <thead>
            <tr>
              <th>เครื่องมือ และเครื่องจักร (Machine type)</th>
              <th style={{ width: 56 }}>Qty</th>
            </tr>
          </thead>
          <tbody>
            {r.equipment.map((e, i) => (
              <tr key={i}>
                <td>
                  {i + 1}. {e.equipmentType}
                </td>
                <td className="c">{e.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </Box>
  );
}

// Signatures close the report, after the summary.
function SignatureBlock({ r }: { r: PrintReport }) {
  const eveningDone = r.eveningStatus === "submitted";
  return (
    <>
      <table className="f" style={{ marginTop: 8, breakInside: "avoid" }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", height: 96, verticalAlign: "top" }}>
              <div className="b">Prepared by Contractor:</div>
              {r.signatureData ? <img src={r.signatureData} alt="signature" style={{ height: 44 }} /> : <div style={{ height: 44 }} />}
              <div>Name {r.signatureName ?? ""}</div>
            </td>
            <td style={{ height: 96, verticalAlign: "top" }}>
              <div className="b">Checked by EPS:</div>
              <div style={{ height: 44 }} />
              <div>Name</div>
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: 10, textAlign: "right", color: "#555" }}>
        Safety: R003/20260702
        {r.morningStatus !== "submitted" ? " · ยังไม่ส่งรายงานเช้า" : ""}
        {!eveningDone ? " · ยังไม่ส่งรายงานบ่าย" : ""}
      </div>
    </>
  );
}

// Under the form: what the paper form has no room for (nationality/sex, NMH, tomorrow's requests, photos).
// Only parts with data are printed; the activity table above already holds plan vs actual.
function SummarySheet({ r }: { r: PrintReport }) {
  const hrs = r.workHours ?? 0;
  const nat = (a: number | null, b: number | null, c: number | null, d: number | null) =>
    a === null ? "-" : `ไทย ช ${a} / ญ ${b} · ต่างชาติ ช ${c} / ญ ${d}`;
  const extraPhotos = r.photos;
  const inspections = r.inspections;
  // The evening form asks only for roads now (plus QAQC and permits): machine/equipment requests are not printed.
  const tomorrowCount = r.roadUsage.length + r.permits.length;
  const morningTotal = sumOf(r.positions);
  const eveningTotal = r.eveningStatus === "submitted" ? r.eveningHeadcount : 0;
  const hasManpower = morningTotal > 0 || eveningTotal > 0;
  const hasRequests = tomorrowCount + inspections.length > 0;
  let n = 0;

  return (
    <Box>
      {hasManpower ? (
        <>
          <Heading>{++n}. กำลังคน เช้า / บ่าย และ NMH</Heading>
          <table className="f">
            <thead>
              <tr>
                <th style={{ width: "16%" }} />
                <th style={{ width: 70 }}>รวม (คน)</th>
                <th>สัญชาติ / เพศ</th>
              </tr>
            </thead>
            <tbody>
              {morningTotal > 0 ? (
                <tr>
                  <td className="b">เช้า</td>
                  <td className="c">{morningTotal}</td>
                  <td>{nat(r.thaiMale, r.thaiFemale, r.foreignMale, r.foreignFemale)}</td>
                </tr>
              ) : null}
              {eveningTotal > 0 ? (
                <tr>
                  <td className="b">บ่าย</td>
                  <td className="c">{eveningTotal}</td>
                  <td>{nat(r.eveningThaiMale, r.eveningThaiFemale, r.eveningForeignMale, r.eveningForeignFemale)}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {new Set(r.crews.map((c) => c.discipline)).size > 1 ? (
            <table className="f" style={{ marginTop: 4 }}>
              <thead>
                <tr>
                  <th style={{ width: "16%" }}>ประเภทงาน</th>
                  <th style={{ width: 60 }}>เช้า</th>
                  <th style={{ width: 60 }}>บ่าย</th>
                  <th>ตำแหน่ง (เช้า)</th>
                </tr>
              </thead>
              <tbody>
                {DISCIPLINES.filter((d) => r.crews.some((c) => c.discipline === d.code)).map((d) => {
                  const morning = r.crews.find((c) => c.shift === "morning" && c.discipline === d.code);
                  const evening = r.crews.find((c) => c.shift === "evening" && c.discipline === d.code);
                  return (
                    <tr key={d.code}>
                      <td className="b">{d.label}</td>
                      <td className="c">{morning ? sumOf(morning.positions) : "-"}</td>
                      <td className="c">{evening ? sumOf(evening.positions) : "-"}</td>
                      <td>{morning?.positions.map((p) => `${POSITIONS.find((x) => x.code === p.position)?.labelTh ?? p.position} ${p.headcount}`).join(" · ") ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
          <div style={{ marginTop: 3 }}>
            {hrs ? `ชม.ทำงาน ${hrs} ชม./คน · ` : ""}
            {r.overtime?.length || r.otHours ? `${overtimeSummary(r)} · ` : ""}
            <b>NMH {r.manHours.toLocaleString()} ชม.</b>
            {eveningTotal > 0 && morningTotal > 0 && eveningTotal !== morningTotal
              ? ` · กำลังคนเช้าและบ่ายต่างกัน ${Math.abs(eveningTotal - morningTotal)} คน`
              : ""}
            {r.overtime?.length ? <div>OT: {overtimeLines(r.overtime).join(" · ")}</div> : null}
          </div>
        </>
      ) : null}

      {hasRequests ? (
        <>
          <Heading>{++n}. คำขอสำหรับ {thaiShortDate(dayjs(r.requestsForDate).format("YYYY-MM-DD"))} (ส่งในรายงานบ่าย)</Heading>
        <table className="f">
          <thead>
            <tr>
              <th style={{ width: 70 }}>ประเภท</th>
              <th>รายการ</th>
              <th style={{ width: 54 }}>อาคาร</th>
              <th style={{ width: 80 }}>เวลา</th>
            </tr>
          </thead>
          <tbody>
            {inspections.map((i) => (
              <tr key={i.id}>
                <td className="c">ขอตรวจ QAQC</td>
                <td>
                  {i.inspectionType && i.inspectionType !== "other" ? `${inspectionTypeLabel(i.inspectionType)} · ` : ""}
                  {i.workItem}
                  {i.location ? ` · ${i.location}` : ""}
                </td>
                <td className="c">{i.buildingCode}</td>
                <td className="c">{dayjs(i.inspectionDate).format("D/M")} {i.inspectionTime}</td>
              </tr>
            ))}
            {r.roadUsage.map((u) => (
              <tr key={u.id}>
                <td className="c">ถนน</td>
                <td>
                  {u.roadLocation} · {u.purpose}
                </td>
                <td className="c">{u.buildingCode || "-"}</td>
                <td className="c">{u.startTime}–{u.endTime}</td>
              </tr>
            ))}
            {r.permits.map((p) => (
              <tr key={p.id}>
                <td className="c">PTW</td>
                <td>
                  {p.permitType === "other" ? p.otherLabel : PERMIT_TYPES.find((t) => t.code === p.permitType)?.label} · {p.workers} คน
                </td>
                <td className="c">{p.buildingCode}</td>
                <td className="c">-</td>
              </tr>
            ))}
          </tbody>
        </table>
        </>
      ) : null}

      {extraPhotos.length > 0 ? (
        <>
          <Heading>{++n}. รูปถ่าย</Heading>
          <table className="f">
            <tbody>
              {Array.from({ length: Math.ceil(extraPhotos.length / 4) }, (_, row) => (
                <tr key={row}>
                  {[0, 1, 2, 3].map((col) => {
                    const p = extraPhotos[row * 4 + col];
                    return (
                      <td key={col} style={{ padding: 1, width: "25%" }}>
                        {p?.url ? <img className="photo" src={p.url} alt="" /> : null}
                        <div style={{ fontSize: 10 }}>{p ? (p.category === "safety" ? "Safety" : "Progress") : ""}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </Box>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div className="b" style={{ margin: "10px 0 4px", fontSize: 14, borderBottom: "1.5px solid #0B4D8B", color: "#0B4D8B" }}>
      {children}
    </div>
  );
}
