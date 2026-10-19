import Box from "@mui/material/Box";
import { PERMIT_TYPES, POSITIONS, SITE_EQUIPMENT_TYPES, WEATHER_CONDITIONS, type PermitType } from "@sts/shared";
import { type PrintReport } from "../types/daily-report.types.js";
import { overtimeSummary } from "../utils/overtime.js";
import { sumOf, thaiShortDate } from "./print-shared.js";

// R003 layout with only what was reported: tables keep their filled rows, parts with no data are left out
// (except manpower and the machine list, which always print like the paper form).
export function FormSheet({ r }: { r: PrintReport }) {
  const w = r.weather;
  const eveningDone = r.eveningStatus === "submitted";
  const operatedDays = r.safetyRecord.daysSinceLastAccident;
  const permitsToday = r.permitsToday;
  // Every standard type (qty 0 when not reported), then the contractor's own extra names.
  const qtyOf = (type: string) => r.equipment.filter((e) => e.equipmentType === type).reduce((s, e) => s + e.qty, 0);
  const machineRows = [
    ...SITE_EQUIPMENT_TYPES.map((type) => ({ type, qty: qtyOf(type) })),
    ...r.equipment
      .filter((e) => !(SITE_EQUIPMENT_TYPES as readonly string[]).includes(e.equipmentType))
      .map((e) => ({ type: e.equipmentType, qty: e.qty })),
  ];
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
  const showMorning = morningTotal > 0 || !hasManpower;
  const showEvening = eveningTotal > 0;
  const shiftCols = 1 + (showMorning ? 1 : 0) + (showEvening ? 1 : 0);
  // Nationality/sex rows under the positions: the left half then holds the whole manpower picture.
  const natRows: { label: string; m: number | null; e: number | null }[] = [
    { label: "ไทย ชาย", m: r.thaiMale, e: r.eveningThaiMale },
    { label: "ไทย หญิง", m: r.thaiFemale, e: r.eveningThaiFemale },
    { label: "ต่างชาติ ชาย", m: r.foreignMale, e: r.eveningForeignMale },
    { label: "ต่างชาติ หญิง", m: r.foreignFemale, e: r.eveningForeignFemale },
  ];

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
      {/* Two halves like the paper form: manpower on the left, today's permits + machine list on the right. */}
      <table className="f">
        <colgroup>
          <col style={{ width: "50%" }} />
          <col style={{ width: "50%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={{ verticalAlign: "top", padding: 0 }}>
              <table className="f" style={{ border: 0 }}>
                <thead>
                  <tr>
                    <td colSpan={shiftCols} className="c b blue">ประเภท/จำนวนผู้ปฏิบัติงาน (Manpower)</td>
                  </tr>
                  <tr>
                    <th>ตำแหน่ง</th>
                    {showMorning ? <th style={{ width: 56 }}>เช้า</th> : null}
                    {showEvening ? <th style={{ width: 56 }}>บ่าย</th> : null}
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
                    {showMorning ? <td className="c">{morningTotal || "-"}</td> : null}
                    {showEvening ? <td className="c">{eveningTotal}</td> : null}
                  </tr>
                  {hasManpower
                    ? natRows.map((n) => (
                        <tr key={n.label}>
                          <td>{n.label}</td>
                          {showMorning ? <td className="c">{morningTotal > 0 ? n.m : "-"}</td> : null}
                          {showEvening ? <td className="c">{n.e ?? "-"}</td> : null}
                        </tr>
                      ))
                    : null}
                  {hasManpower ? (
                    <tr className="b">
                      <td>{r.workHours ? `NMH (${r.workHours} ชม./คน${otLabel ? " + OT" : ""})` : "NMH"}</td>
                      <td colSpan={shiftCols - 1} className="c">
                        {r.manHours.toLocaleString()} ชม.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </td>
            <td style={{ verticalAlign: "top", padding: 0 }}>
              <table className="f" style={{ border: 0 }}>
                <tbody>
                  {hasPermits ? (
                    <>
                      <tr>
                        <td colSpan={2} className="c b blue">Today Work Permit</td>
                      </tr>
                      {permitLines.map((p) => (
                        <tr key={p.code}>
                          <td>☑ {p.label}</td>
                          <td className="c" style={{ width: 56 }}>{permitWorkers(p.code)} คน</td>
                        </tr>
                      ))}
                      {otherPermits.map((p) => (
                        <tr key={p.id}>
                          <td>☑ {p.otherLabel ?? "Other"}</td>
                          <td className="c" style={{ width: 56 }}>{p.workers} คน</td>
                        </tr>
                      ))}
                    </>
                  ) : null}
                  <tr>
                    <td className="c b blue">เครื่องมือ และเครื่องจักร (Machine type)</td>
                    <td className="c b blue" style={{ width: 56 }}>Qty</td>
                  </tr>
                  {/* Like the paper R003: every type prints, a type with no units has a blank Qty. */}
                  {machineRows.map((m, i) => (
                    <tr key={m.type}>
                      <td>
                        {i + 1}. {m.type}
                      </td>
                      <td className="c">{m.qty || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
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

    </Box>
  );
}

// Signatures close the report, after the summary.
export function SignatureBlock({ r }: { r: PrintReport }) {
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

