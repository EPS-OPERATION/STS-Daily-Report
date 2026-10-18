import { PERMIT_TYPES, POSITIONS, WEATHER_CONDITIONS, type PermitType } from "@sts/shared";
import { overtimeSummary } from "../utils/overtime.js";
import { type PrintReport } from "../types/daily-report.types.js";
import Box from "@mui/material/Box";
import { MAX_ACTIVITY_ROWS } from "./print-shared.js";
import { thaiShortDate } from "./print-shared.js";
import { tick } from "./print-shared.js";
import { sumOf } from "./print-shared.js";

export function FormSheet({ r }: { r: PrintReport }) {
  const w = r.weather;
  const eveningDone = r.eveningStatus === "submitted";
  const operatedDays = r.safetyRecord.daysSinceLastAccident;
  const permitsToday = r.permitsToday;
  const permitWorkers = (type: PermitType) => permitsToday.filter((p) => p.permitType === type).reduce((s, p) => s + p.workers, 0);
  const otherPermits = permitsToday.filter((p) => p.permitType === "other");
  const activities = r.allocations.slice(0, MAX_ACTIVITY_ROWS);
  const forecast = r.forecasts.slice(0, MAX_ACTIVITY_ROWS);
  const behind = r.allocations.filter((a) => a.countermeasure);
  const morningTotal = sumOf(r.positions);
  const eveningTotal = r.eveningHeadcount;
  const equipmentRows = Array.from({ length: 12 }, (_, i) => r.equipment[i] ?? null);

  return (
    <Box className="sheet">
      <table className="f">
        <tbody>
          <tr>
            <td rowSpan={2} style={{ width: "26%" }}>
              {/* logo-eps.png is a 447px square with the mark at x52–388, y184–260: crop the padding. */}
              <div style={{ width: 200, height: 45, overflow: "hidden", position: "relative", margin: "2px 0" }}>
                <img src="/brand/logo-eps.png" alt="EPS" style={{ position: "absolute", width: 266, height: 266, left: -31, top: -110 }} />
              </div>
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
            <td style={{ width: "25%" }}>Total OT: {r.overtime?.length ? overtimeSummary(r).replace(/^OT /, "") : `${r.otHours ?? 0} hr.`}</td>
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
            const low = a && a.planPercent !== null && (a.actualPercent ?? 0) < a.planPercent;
            return (
              <tr key={i} style={{ height: 18 }}>
                <td className="c">{i + 1}</td>
                <td>{a?.workDescription ?? ""}</td>
                <td className="c">{a?.headcount ?? ""}</td>
                <td className="c">{a ? (a.planPercent === null ? "-" : `${a.planPercent}%`) : "%"}</td>
                <td className="c" style={{ color: low ? "#b45309" : undefined, fontWeight: low ? 700 : undefined }}>
                  {a ? (a.actualPercent === null ? "-" : `${a.actualPercent}%`) : "%"}
                </td>
                <td className="c">{a?.buildingCode ?? ""}</td>
                <td className="c">{i + 1}</td>
                <td>{f?.description ?? ""}</td>
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
            <td style={{ width: "55%", padding: 0, verticalAlign: "top" }}>
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
                <tbody>
                  <tr>
                    <td style={{ height: 110, verticalAlign: "top" }}>
                      <div className="b">Prepared by Contractor:</div>
                      <div>Signature</div>
                      {r.signatureData ? <img src={r.signatureData} alt="signature" style={{ height: 40 }} /> : null}
                      <div>Name {r.signatureName ?? ""}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ height: 110, verticalAlign: "top" }}>
                      <div className="b">Checked by EPS:</div>
                      <div>Signature</div>
                      <div style={{ height: 40 }} />
                      <div>Name</div>
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
