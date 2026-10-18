import { DISCIPLINES, PERMIT_TYPES, POSITIONS } from "@sts/shared";
import { inspectionTypeLabel } from "@/features/qaqc/index.js";
import { overtimeLines, overtimeSummary } from "../utils/overtime.js";
import { toIsoDate } from "@/lib/dates.js";
import { type PrintReport } from "../types/daily-report.types.js";
import { formatNumber } from "@/lib/format.js";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { thaiShortDate } from "./print-shared.js";
import { sumOf } from "./print-shared.js";
import { Heading } from "./print-shared.js";

// Page 2 — the extra information that makes the report useful beyond the paper form.
export function SummarySheet({ r }: { r: PrintReport }) {
  const hrs = r.workHours ?? 0;
  const nat = (a: number | null, b: number | null, c: number | null, d: number | null) =>
    a === null ? "-" : `ไทย ช ${a} / ญ ${b} · ต่างชาติ ช ${c} / ญ ${d}`;
  const extraPhotos = r.photos;
  const inspections = r.inspections;
  const tomorrowCount = r.machinery.length + r.equipmentRequests.length + r.roadUsage.length + r.permits.length;

  return (
    <Box className="sheet">
      <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 0.5 }}>
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
        ชม.ทำงาน {hrs} ชม./คน · {overtimeSummary(r)} · <b>NMH {formatNumber(r.manHours)} ชม.</b> (man-day = (คนเช้า + คนบ่าย) ÷ 2 · NMH = man-day × ชม.ทำงาน + {r.overtime?.length ? "Σ คนที่ทำ OT × ชม. OT" : "คนบ่าย × OT"})
        {r.overtime?.length ? <div>OT: {overtimeLines(r.overtime).join(" · ")}</div> : null}
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
            const diff = a.actualPercent === null || a.planPercent === null ? null : a.actualPercent - a.planPercent;
            return (
              <tr key={a.id}>
                <td>{a.buildingName}</td>
                <td>
                  {a.workDescription}
                  {a.countermeasure ? <div style={{ color: "#b45309" }}>Countermeasure: {a.countermeasure}</div> : null}
                </td>
                <td className="c">{a.headcount}</td>
                <td className="c">{a.planPercent === null ? "-" : `${a.planPercent}%`}</td>
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

      <Heading>3. คำขอสำหรับ {thaiShortDate(toIsoDate(r.requestsForDate))} (ส่งในรายงานบ่าย)</Heading>
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
                  {i.inspectionType && i.inspectionType !== "other" ? `${inspectionTypeLabel(i.inspectionType)} · ` : ""}
                  {i.workItem}
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

      {extraPhotos.length > 0 ? (
        <>
          <Heading>4. รูปถ่าย</Heading>
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
    </Box>
  );
}
