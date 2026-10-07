import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { DISCIPLINES, PERMIT_TYPES, POSITIONS, WEATHER_CONDITIONS, type PermitType } from "@sts/shared";
import dayjs from "dayjs";
import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { usePrintReport, inspectionTypeLabel, type PrintReport } from "@/features/daily-reports/index.js";

const BLUE = "#dbe9f6";
const MAX_ACTIVITY_ROWS = 10;
const PHOTO_SLOTS = 6;

// Buddhist-era short date as written on the paper form (3/9/69).
function thaiShortDate(iso: string): string {
  const d = dayjs(iso);
  return `${d.date()}/${d.month() + 1}/${String(d.year() + 543).slice(-2)}`;
}

const tick = (on: boolean) => (on ? "☑" : "☐");
const sumOf = (rows: { headcount: number }[]) => rows.reduce((s, r) => s + r.headcount, 0);

// Printable EPS "Daily Request & Report" (form R003/20260702) filled from the submitted
// morning + evening data, plus a second page with what the paper form has no room for
// (morning vs afternoon crew, nationality/sex, tomorrow's requests, materials).
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
    <Box sx={{ bgcolor: "#fff", color: "#000", fontFamily: "'Noto Sans Thai', 'Inter', sans-serif" }}>
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        .sheet { break-after: page; font-size: 10px; line-height: 1.25; }
        .sheet:last-child { break-after: auto; }
        .f { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .f td, .f th { border: 1px solid #222; padding: 2px 4px; vertical-align: middle; overflow-wrap: anywhere; }
        .f th { background: ${BLUE}; font-weight: 700; text-align: center; }
        .c { text-align: center; } .b { font-weight: 700; } .blue { background: ${BLUE}; }
        .photo { height: 78px; object-fit: cover; width: 100%; display: block; }
        .gap { height: 6px; }
      `}</style>

      <Stack direction="row" spacing={1} className="no-print" sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Button onClick={() => window.print()}>พิมพ์ / บันทึกเป็น PDF</Button>
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: "center" }}>
          ในหน้าต่างพิมพ์ เลือก "Save as PDF" / "บันทึกเป็น PDF"
        </Typography>
      </Stack>

      <FormSheet r={r} />
      <SummarySheet r={r} />
    </Box>
  );
}

function FormSheet({ r }: { r: PrintReport }) {
  const w = r.weather;
  const eveningDone = r.eveningStatus === "submitted";
  const operatedDays = r.safetyRecord.daysSinceLastAccident;
  const permitsToday = r.permitsToday;
  const permitWorkers = (type: PermitType) => permitsToday.filter((p) => p.permitType === type).reduce((s, p) => s + p.workers, 0);
  const otherPermits = permitsToday.filter((p) => p.permitType === "other");
  const activities = r.allocations.slice(0, MAX_ACTIVITY_ROWS);
  const forecast = r.inspections.filter((i) => i.inspectionDate > r.reportDate).slice(0, MAX_ACTIVITY_ROWS);
  const behind = r.allocations.filter((a) => a.countermeasure);
  const photos = r.photos.slice(0, PHOTO_SLOTS);
  const morningTotal = sumOf(r.positions);
  const eveningTotal = r.eveningHeadcount;
  const equipmentRows = Array.from({ length: 12 }, (_, i) => r.equipment[i] ?? null);

  return (
    <Box className="sheet">
      <table className="f">
        <tbody>
          <tr>
            <td rowSpan={2} style={{ width: "26%" }}>
              <img src="/brand/logo-eps.png" alt="EPS" style={{ height: 36 }} />
              <div style={{ fontSize: 9 }}>บริษัทอีโค่ แพลนท์ เซอร์วิสเซส จำกัด</div>
            </td>
            <td rowSpan={2} className="c blue" style={{ width: "34%" }}>
              <div className="b" style={{ fontSize: 15 }}>รายงานประจำวัน</div>
              <div>(Daily Request &amp; Report)</div>
            </td>
            <td colSpan={2} className="c b">
              {r.contractorName || r.contractorCode} ({r.contractorCode})
            </td>
          </tr>
          <tr>
            <td colSpan={2}>
              {(["CE", "ME", "EE"] as const).map((d) => (
                <span key={d} style={{ marginRight: 8 }}>
                  {tick(r.disciplines.includes(d))} {d}
                </span>
              ))}
            </td>
          </tr>
        </tbody>
      </table>
      <table className="f">
        <tbody>
          <tr>
            <td style={{ width: "50%" }}>Project Name: {r.projectName}</td>
            <td style={{ width: "25%" }}>Total OT: {r.otHours ?? 0} hr.</td>
            <td style={{ width: "25%" }}>Report No: -</td>
          </tr>
          <tr>
            <td>
              Time Start: {r.startTime ?? "-"} am. &nbsp; Time Finish: {r.endTime ?? "-"} pm.
            </td>
            <td>Working time {r.workHours ?? "-"} hr.</td>
            <td>Date: {thaiShortDate(r.reportDate)}</td>
          </tr>
        </tbody>
      </table>
      <table className="f">
        <tbody>
          <tr>
            <td colSpan={2} className="c b blue">Weather report during the construction</td>
            <td colSpan={2} className="c b blue">สถิติความปลอดภัย (Safety Record)</td>
          </tr>
          <tr>
            <td colSpan={2}>
              {WEATHER_CONDITIONS.map((c) => (
                <span key={c.code} style={{ marginRight: 6 }}>
                  {tick(w === c.code)} {c.label}
                </span>
              ))}
              <div>
                อุณหภูมิ {r.temperatureC ?? "-"}°C · ความชื้น {r.humidityPct ?? "-"}%
              </div>
            </td>
            <td colSpan={2}>
              <div>
                เกิดอุบัติเหตุมาแล้ว (Last Accident Occurred): <b>{r.safetyRecord.accidents}</b> ครั้ง
              </div>
              <div>
                เราทำงานมาแล้ว (We have operated): <b>{operatedDays}</b> วัน
              </div>
              <div style={{ color: r.accidentOccurred ? "#c00" : undefined }}>
                วันนี้: {r.accidentOccurred === null ? "-" : r.accidentOccurred ? `เกิดอุบัติเหตุ — ${r.accidentNote ?? ""}` : "ไม่เกิดอุบัติเหตุ"}
              </div>
            </td>
          </tr>
          <tr>
            <td colSpan={2} className="c b blue">ประเภท/จำนวนผู้ปฏิบัติงาน (Manpower)</td>
            <td colSpan={2} className="c b blue">Today Work Permit</td>
          </tr>
          <tr>
            <td colSpan={2} style={{ verticalAlign: "top", padding: 0 }}>
              <table className="f" style={{ border: 0 }}>
                <thead>
                  <tr>
                    <th>ตำแหน่ง</th>
                    <th style={{ width: 44 }}>เช้า</th>
                    <th style={{ width: 44 }}>บ่าย</th>
                  </tr>
                </thead>
                <tbody>
                  {POSITIONS.filter((p) => r.positions.some((x) => x.position === p.code) || r.eveningPositions.some((x) => x.position === p.code)).map((p) => (
                    <tr key={p.code}>
                      <td>{p.labelTh}</td>
                      <td className="c">{r.positions.find((x) => x.position === p.code)?.headcount ?? "-"}</td>
                      <td className="c">{r.eveningPositions.find((x) => x.position === p.code)?.headcount ?? "-"}</td>
                    </tr>
                  ))}
                  <tr className="b blue">
                    <td>Today manpower</td>
                    <td className="c">{morningTotal || "-"}</td>
                    <td className="c">{eveningDone ? eveningTotal : "-"}</td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td colSpan={2} style={{ verticalAlign: "top" }}>
              {PERMIT_TYPES.filter((p) => p.code !== "other").map((p) => (
                <div key={p.code}>
                  {tick(permitWorkers(p.code) > 0)} {p.label}
                  {permitWorkers(p.code) > 0 ? ` — ${permitWorkers(p.code)} คน` : ""}
                </div>
              ))}
              <div>
                {tick(otherPermits.length > 0)} Other
                {otherPermits.length > 0 ? ` — ${otherPermits.map((p) => `${p.otherLabel ?? ""} ${p.workers} คน`).join(", ")}` : ""}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: 8, padding: "1px 0" }}>
        * หากความเร็วลม ≥ 14 mph: หยุดงานที่สูง, งานยก และหากมีฝน 90% / Wet Surfaces หยุดงานที่สูง ยก เชื่อมไฟฟ้า
      </div>

      <table className="f">
        <colgroup>
          <col style={{ width: 30 }} />
          <col />
          <col style={{ width: 32 }} />
          <col style={{ width: 38 }} />
          <col style={{ width: 42 }} />
          <col style={{ width: 46 }} />
          <col style={{ width: 30 }} />
          <col style={{ width: "30%" }} />
          <col style={{ width: 46 }} />
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
          {Array.from({ length: MAX_ACTIVITY_ROWS }, (_, i) => {
            const a = activities[i];
            const f = forecast[i];
            const low = a && (a.actualPercent ?? 0) < a.planPercent;
            return (
              <tr key={i} style={{ height: 18 }}>
                <td className="c">{i + 1}</td>
                <td>{a?.workDescription ?? ""}</td>
                <td className="c">{a?.headcount ?? ""}</td>
                <td className="c">{a ? `${a.planPercent}%` : "%"}</td>
                <td className="c" style={{ color: low ? "#b45309" : undefined, fontWeight: low ? 700 : undefined }}>
                  {a ? (a.actualPercent === null ? "-" : `${a.actualPercent}%`) : "%"}
                </td>
                <td className="c">{a?.buildingCode ?? ""}</td>
                <td className="c">{i + 1}</td>
                <td>{f ? `${inspectionTypeLabel(f.inspectionType)} · ${f.workItem}` : ""}</td>
                <td className="c">{f?.buildingCode ?? ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <table className="f">
        <tbody>
          <tr>
            <td className="b" style={{ height: 46, verticalAlign: "top" }}>
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

      <div className="gap" />
      <table className="f">
        <tbody>
          <tr>
            <td style={{ width: "38%", padding: 0, verticalAlign: "top" }}>
              <table className="f" style={{ border: 0 }}>
                <thead>
                  <tr>
                    <th>เครื่องมือ และเครื่องจักร (Machine type)</th>
                    <th style={{ width: 40 }}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentRows.map((e, i) => (
                    <tr key={i} style={{ height: 17 }}>
                      <td>
                        {i + 1}. {e?.equipmentType ?? ""}
                      </td>
                      <td className="c">{e?.qty ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
            <td style={{ padding: 0, verticalAlign: "top" }}>
              <table className="f" style={{ border: 0 }}>
                <thead>
                  <tr>
                    <th colSpan={3}>Daily Progress and Highrisk Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {[0, 1].map((row) => (
                    <tr key={row}>
                      {[0, 1, 2].map((col) => {
                        const idx = row * 3 + col;
                        const p = photos[idx];
                        return (
                          <td key={col} style={{ padding: 1, height: 96, verticalAlign: "top" }}>
                            {p?.url ? <img className="photo" src={p.url} alt="" /> : <div style={{ height: 78 }} />}
                            <div style={{ fontSize: 8 }}>
                              No.{idx + 1}: {p ? (p.category === "safety" ? "Safety" : "Progress") : ""}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2} style={{ height: 54, verticalAlign: "top" }}>
                      <div className="b">Prepared by Contractor:</div>
                      <div>Signature</div>
                      {r.signatureData ? <img src={r.signatureData} alt="signature" style={{ height: 24 }} /> : null}
                      <div>Name {r.signatureName ?? ""}</div>
                    </td>
                    <td style={{ verticalAlign: "top" }}>
                      <div className="b">Checked by EPS:</div>
                      <div>
                        {r.reviewStatus === "approved" ? "✔ อนุมัติแล้ว" : r.reviewStatus === "rejected" ? "✘ ส่งกลับแก้ไข" : "รอตรวจสอบ"}
                      </div>
                      <div style={{ fontSize: 8 }}>Signature</div>
                      <div style={{ fontSize: 8 }}>Name</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
      <div style={{ fontSize: 8, textAlign: "right", color: "#555" }}>
        Safety: R003/20260702
        {r.morningStatus !== "submitted" ? " · ยังไม่ส่งรายงานเช้า" : ""}
        {!eveningDone ? " · ยังไม่ส่งรายงานบ่าย (ข้อมูลบางส่วนอาจว่าง)" : ""}
      </div>
    </Box>
  );
}

// Page 2 — the extra information that makes the report useful beyond the paper form.
function SummarySheet({ r }: { r: PrintReport }) {
  const hrs = r.workHours ?? 0;
  const nat = (a: number | null, b: number | null, c: number | null, d: number | null) =>
    a === null ? "-" : `ไทย ช ${a} / ญ ${b} · ต่างชาติ ช ${c} / ญ ${d}`;
  const extraPhotos = r.photos.slice(PHOTO_SLOTS);
  const inspections = r.inspections;
  const tomorrowCount = r.machinery.length + r.equipmentRequests.length + r.roadUsage.length + r.permits.length;

  return (
    <Box className="sheet">
      <Typography sx={{ fontWeight: 800, fontSize: 14, mb: 0.5 }}>
        สรุปรายงานประจำวัน — {r.contractorName || r.contractorCode} · {thaiShortDate(r.reportDate)}
      </Typography>

      <Heading>1. กำลังคน เช้า / บ่าย และ NMH</Heading>
      <table className="f">
        <thead>
          <tr>
            <th style={{ width: "16%" }} />
            <th style={{ width: 54 }}>รวม (คน)</th>
            <th>สัญชาติ / เพศ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="b">เช้า</td>
            <td className="c">{sumOf(r.positions) || "-"}</td>
            <td>{nat(r.thaiMale, r.thaiFemale, r.foreignMale, r.foreignFemale)}</td>
          </tr>
          <tr>
            <td className="b">บ่าย</td>
            <td className="c">{r.eveningHeadcount || "-"}</td>
            <td>{nat(r.eveningThaiMale, r.eveningThaiFemale, r.eveningForeignMale, r.eveningForeignFemale)}</td>
          </tr>
        </tbody>
      </table>
      {new Set(r.crews.map((c) => c.discipline)).size > 1 ? (
        <table className="f" style={{ marginTop: 4 }}>
          <thead>
            <tr>
              <th style={{ width: "16%" }}>ประเภทงาน</th>
              <th style={{ width: 54 }}>เช้า</th>
              <th style={{ width: 54 }}>บ่าย</th>
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
        ชม.ทำงาน {hrs} ชม./คน · OT {r.otHours ?? 0} ชม./คน · <b>NMH {r.manHours.toLocaleString()} ชม.</b> (คำนวณจากกำลังคนเช้า × (ชม.ทำงาน + OT))
        {r.eveningHeadcount > 0 && sumOf(r.positions) > 0 && r.eveningHeadcount !== sumOf(r.positions)
          ? ` · กำลังคนเช้าและบ่ายต่างกัน ${Math.abs(r.eveningHeadcount - sumOf(r.positions))} คน`
          : ""}
      </div>

      <Heading>2. ผลงานรายอาคาร (Plan vs Actual)</Heading>
      <table className="f">
        <thead>
          <tr>
            <th style={{ width: "22%" }}>อาคาร</th>
            <th>งานที่ทำ</th>
            <th>คน</th>
            <th style={{ width: 40 }}>แผน</th>
            <th style={{ width: 44 }}>จริง</th>
            <th style={{ width: 44 }}>ผลต่าง</th>
          </tr>
        </thead>
        <tbody>
          {r.allocations.map((a) => {
            const diff = a.actualPercent === null ? null : a.actualPercent - a.planPercent;
            return (
              <tr key={a.id}>
                <td>{a.buildingName}</td>
                <td>
                  {a.workDescription}
                  {a.countermeasure ? <div style={{ color: "#b45309" }}>Countermeasure: {a.countermeasure}</div> : null}
                </td>
                <td className="c">{a.headcount}</td>
                <td className="c">{a.planPercent}%</td>
                <td className="c">{a.actualPercent === null ? "-" : `${a.actualPercent}%`}</td>
                <td className="c b" style={{ color: diff !== null && diff < 0 ? "#b45309" : "#127a2b" }}>
                  {diff === null ? "-" : diff > 0 ? `+${diff}%` : `${diff}%`}
                </td>
              </tr>
            );
          })}
          {r.allocations.length === 0 ? (
            <tr>
              <td colSpan={6} className="c">ไม่มีข้อมูลผลงาน (ไม่มีรายงานเช้า)</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <Heading>3. คำขอสำหรับ {thaiShortDate(dayjs(r.requestsForDate).format("YYYY-MM-DD"))} (ส่งในรายงานบ่าย)</Heading>
      {tomorrowCount + inspections.length === 0 ? (
        <div>ไม่มีคำขอ</div>
      ) : (
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
                  {inspectionTypeLabel(i.inspectionType)} · {i.workItem}
                  {i.location ? ` · ${i.location}` : ""}
                </td>
                <td className="c">{i.buildingCode}</td>
                <td className="c">{dayjs(i.inspectionDate).format("D/M")} {i.inspectionTime}</td>
              </tr>
            ))}
            {r.machinery.map((m) => (
              <tr key={m.id}>
                <td className="c">เครื่องจักร</td>
                <td>
                  {m.machineType}
                  {m.unitTag ? ` (${m.unitTag})` : ""}
                  {m.purpose ? ` · ${m.purpose}` : ""}
                </td>
                <td className="c">{m.buildingCode}</td>
                <td className="c">{m.startTime && m.endTime ? `${m.startTime}–${m.endTime}` : "ทั้งวัน"}</td>
              </tr>
            ))}
            {r.equipmentRequests.map((e) => (
              <tr key={e.id}>
                <td className="c">อุปกรณ์</td>
                <td>
                  {e.equipmentType} ×{e.qty}
                  {e.purpose ? ` · ${e.purpose}` : ""}
                </td>
                <td className="c">{e.buildingCode}</td>
                <td className="c">-</td>
              </tr>
            ))}
            {r.roadUsage.map((u) => (
              <tr key={u.id}>
                <td className="c">ถนน</td>
                <td>
                  {u.roadLocation} · {u.purpose}
                </td>
                <td className="c">{u.buildingCode}</td>
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
      )}
      {r.machineryConflicts.length + r.roadConflicts.length > 0 ? (
        <div style={{ marginTop: 3, color: "#b45309", fontWeight: 700 }}>
          ⚠ มีคำขอชนกับผู้รับเหมาอื่น:{" "}
          {[
            ...r.machineryConflicts.map((c) => `${c.machineType}${c.unitTag ? ` (${c.unitTag})` : ""}`),
            ...r.roadConflicts.map((c) => `ถนน ${c.roadLocation}`),
          ].join(", ")}
        </div>
      ) : null}

      <Heading>4. วัสดุหน้างาน (Materials on site)</Heading>
      {r.materials.length === 0 ? (
        <div>ไม่มีการรายงานวัสดุ</div>
      ) : (
        <div>{r.materials.map((m) => `${m.materialName} ${m.qty.toLocaleString()} ${m.unit}`).join(" · ")}</div>
      )}

      {extraPhotos.length > 0 ? (
        <>
          <Heading>5. รูปถ่ายเพิ่มเติม</Heading>
          <table className="f">
            <tbody>
              {Array.from({ length: Math.ceil(extraPhotos.length / 4) }, (_, row) => (
                <tr key={row}>
                  {[0, 1, 2, 3].map((col) => {
                    const p = extraPhotos[row * 4 + col];
                    return (
                      <td key={col} style={{ padding: 1, width: "25%" }}>
                        {p?.url ? <img className="photo" src={p.url} alt="" /> : null}
                        <div style={{ fontSize: 8 }}>{p ? (p.category === "safety" ? "Safety" : "Progress") : ""}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {r.reviewNote ? (
        <div style={{ marginTop: 6 }}>
          <b>หมายเหตุจาก EPS:</b> {r.reviewNote}
        </div>
      ) : null}
    </Box>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div className="b" style={{ margin: "8px 0 3px", fontSize: 11, borderBottom: "1.5px solid #0B4D8B", color: "#0B4D8B" }}>
      {children}
    </div>
  );
}
