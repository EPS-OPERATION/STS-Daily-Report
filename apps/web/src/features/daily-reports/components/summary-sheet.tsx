import Box from "@mui/material/Box";
import { DISCIPLINES, PERMIT_TYPES, POSITIONS } from "@sts/shared";
import dayjs from "dayjs";
import { inspectionTypeLabel } from "@/features/qaqc/index.js";
import { type PrintReport } from "../types/daily-report.types.js";
import { overtimeLines, overtimeSummary } from "../utils/overtime.js";
import { FormSheet, SignatureBlock } from "./form-sheet.js";
import { Heading, sumOf, thaiShortDate } from "./print-shared.js";

// Under the form: what the paper form has no room for (crews per discipline, OT detail, tomorrow's requests, photos).
// Nationality/sex and NMH sit in the form's manpower half.
// Only parts with data are printed; the activity table above already holds plan vs actual.
export function SummarySheet({ r }: { r: PrintReport }) {
  const extraPhotos = r.photos;
  const inspections = r.inspections;
  // The evening form asks only for roads now (plus QAQC and permits): machine/equipment requests are not printed.
  const tomorrowCount = r.roadUsage.length + r.permits.length;
  const morningTotal = sumOf(r.positions);
  const eveningTotal = r.eveningStatus === "submitted" ? r.eveningHeadcount : 0;
  const multiCrew = new Set(r.crews.map((c) => c.discipline)).size > 1;
  const shiftGap = eveningTotal > 0 && morningTotal > 0 && eveningTotal !== morningTotal;
  const hasManpower = multiCrew || Boolean(r.overtime?.length) || shiftGap;
  const hasRequests = tomorrowCount + inspections.length > 0;
  let n = 0;

  return (
    <Box>
      {hasManpower ? (
        <>
          <Heading>{++n}. กำลังคนแยกประเภทงาน และ OT</Heading>
          {multiCrew ? (
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
            {[
              r.overtime?.length || r.otHours ? overtimeSummary(r) : "",
              shiftGap ? `กำลังคนเช้าและบ่ายต่างกัน ${Math.abs(eveningTotal - morningTotal)} คน` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
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

// One report = form + summary + signatures, flowing onto a second page only when it does not fit.
export function ReportSheet({ r }: { r: PrintReport }) {
  return (
    <Box className="sheet">
      <FormSheet r={r} />
      <SummarySheet r={r} />
      <SignatureBlock r={r} />
    </Box>
  );
}
