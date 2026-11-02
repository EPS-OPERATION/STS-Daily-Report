import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import DirectionsWalkOutlinedIcon from "@mui/icons-material/DirectionsWalkOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ConfirmDialog } from "@/components/ui/confirm-dialog.js";
import { DateRangeFields } from "@/components/ui/date-range-fields.js";
import { PageHeader } from "@/components/ui/page-header.js";
import { QueryError } from "@/components/ui/query-error.js";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import { OverviewTab } from "@/features/safety/components/safety-overview-tab.js";
import { LineWalkTab } from "@/features/safety/components/line-walk-tab.js";
import { CHART_OTHER } from "@/app/theme/chart-palette.js";
import { toast } from "sonner";
import { contractorColorMap } from "@/features/contractors/index.js";
import { ContractorFilterPopover } from "@/features/contractors/index.js";
import { addDaysIso, mondayOf, todayIso, toIsoDate } from "@/lib/dates.js";
import { useDailyRequests } from "@/features/daily-requests/index.js";
import { useCurrentProject, useProjectContractors } from "@/features/projects/index.js";
import {
  FindingDialog,
  findingTitle,
  isFullWeek,
  useDeleteFinding,
  useRenumberWeek,
  useSafetyFindings,
  useSafetyStats,
  weekNeedsRenumber,
  type SafetyFinding,
} from "@/features/safety/index.js";
import { isoWeekLabel } from "@sts/shared";
import ThunderstormOutlinedIcon from "@mui/icons-material/ThunderstormOutlined";
import { HttpError } from "@/services/http/client.js";
import { WorkPermitsView } from "../components/work-permits-view.js";
import { RainLogView } from "@/features/safety/index.js";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

type SafetyTab = "safety" | "linewalk" | "permits" | "rain";

// Safety: EPS line walk entry + statistics from contractor reports + PDF export + Work Permits board + Rain delay log.
export function SafetyPage() {
  const [params, setParams] = useSearchParams();
  const rawTab = params.get("tab");
  const tab: SafetyTab =
    rawTab === "linewalk"
      ? "linewalk"
      : rawTab === "permits"
        ? "permits"
        : rawTab === "rain"
          ? "rain"
          : "safety";

  const setTab = (next: SafetyTab) => {
    const p = new URLSearchParams(params);
    if (next === "safety") {
      p.delete("tab");
    } else {
      p.set("tab", next);
    }
    setParams(p, { replace: true });
  };

  const monday = mondayOf(todayIso());
  const rawFrom = ISO_DATE.test(params.get("from") ?? "") ? params.get("from")! : monday;
  const rawTo = ISO_DATE.test(params.get("to") ?? "") ? params.get("to")! : addDaysIso(monday, 6);
  const from = rawFrom <= rawTo ? rawFrom : rawTo;
  const to = rawFrom <= rawTo ? rawTo : rawFrom;
  const { projectId } = useCurrentProject();
  const projectContractors = useProjectContractors(projectId).data?.data ?? [];
  const stats = useSafetyStats(projectId, from, to);
  const findings = useSafetyFindings(projectId, from, to);
  // Permits are requested in the afternoon report; used for the permits tab counts.
  const permits = useDailyRequests(projectId, from, to).data?.data.permits ?? [];
  const remove = useDeleteFinding(projectId);
  const renumber = useRenumberWeek(projectId);
  const [editing, setEditing] = useState<SafetyFinding | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SafetyFinding | null>(null);
  const [renumberOpen, setRenumberOpen] = useState(false);

  const setRange = (f: string, t: string) => {
    const p = new URLSearchParams(params);
    p.set("from", f);
    p.set("to", t);
    setParams(p, { replace: true });
  };

  const fullWeek = isFullWeek(from, to);

  const handleExportCsv = () => {
    // "No." restarts at 1 every ISO week; "Item ID" is the permanent running number of the project.
    const headers = [
      "Week",
      "No.",
      "Observations Identified",
      "Location",
      "Location Detail",
      "Action to be taken",
      "Responsible Contractor",
      "Inspection Date",
      "Expected Complete Date",
      "Finding Type",
      "Status",
      "Item ID",
    ];
    const csvRows = visibleRows.map((r) => [
      isoWeekLabel(r.weekStart),
      r.weekNo,
      `"${(r.observation || "").replace(/"/g, '""')}"`,
      `"${(r.buildingCode || "").replace(/"/g, '""')}"`,
      `"${(r.locationDetail || "").replace(/"/g, '""')}"`,
      `"${(r.actionToBeTaken || "").replace(/"/g, '""')}"`,
      `"${r.contractorCode || ""}"`,
      toIsoDate(r.inspectionDate),
      r.expectedCompleteDate ? toIsoDate(r.expectedCompleteDate) : "",
      r.findingType === "unsafe_act" ? "Unsafe Act" : "Unsafe Condition",
      r.status === "done" ? "DONE" : "OPEN",
      r.itemNo,
    ].join(","));
    const content = "\uFEFF" + [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Safety_Line_Walk_${fullWeek ? isoWeekLabel(from) : `${from}_${to}`}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const s = stats.data?.data;
  const rows: SafetyFinding[] = findings.data?.data ?? [];

  const contractorNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of projectContractors) if (c.code) m.set(c.code, c.name);
    for (const p of permits) if (p.contractorCode) m.set(p.contractorCode, p.contractorName || m.get(p.contractorCode) || "");
    for (const r of rows) if (r.contractorCode) m.set(r.contractorCode, r.contractorName || m.get(r.contractorCode) || "");
    return m;
  }, [projectContractors, permits, rows]);

  const allCodes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.contractorCode) set.add(r.contractorCode);
    for (const p of permits) if (p.contractorCode) set.add(p.contractorCode);
    for (const c of projectContractors) if (c.code) set.add(c.code);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows, permits, projectContractors]);

  const selectedCodes = useMemo<Set<string>>(() => {
    const raw = params.get("contractors");
    if (raw === null) return new Set(allCodes);
    return new Set(raw.split(",").map((c) => c.trim()).filter((c) => allCodes.includes(c)));
  }, [params, allCodes]);

  const setContractors = (next: Set<string>) => {
    const p = new URLSearchParams(params);
    if (next.size === allCodes.length) p.delete("contractors");
    else p.set("contractors", [...next].sort().join(","));
    setParams(p, { replace: true });
  };

  const colors = useMemo(() => contractorColorMap(allCodes, projectContractors), [allCodes, projectContractors]);

  const filterItems = useMemo(() => {
    return allCodes.map((code: string) => {
      const n =
        tab === "permits"
          ? permits.filter((p) => p.contractorCode === code).length
          : rows.filter((r) => r.contractorCode === code).length;
      return {
        code,
        name: contractorNames.get(code),
        color: colors.get(code) ?? CHART_OTHER,
        countLabel: tab === "permits" ? `${n} permits` : `${n} items`,
      };
    });
  }, [allCodes, tab, rows, permits, contractorNames, colors]);

  const visibleRows: SafetyFinding[] = useMemo(
    () => rows.filter((r) => !r.contractorCode || selectedCodes.has(r.contractorCode)),
    [rows, selectedCodes],
  );

  // «Renumber week» appears only when numbers have gaps or are out of date order; it works on one whole ISO week.
  const renumberNeeded = weekNeedsRenumber(rows);
  const renumberHint = fullWeek ? null : "เลขมีช่องว่าง — เลือกช่วงเป็นสัปดาห์เต็ม (จันทร์–อาทิตย์) ด้วยลูกศรสัปดาห์ก่อน แล้วจึงจัดเลขใหม่ได้";

  const error = [stats.error, findings.error, remove.error, renumber.error].find((e) => e instanceof HttpError) as HttpError | undefined;

  return (
    <Box>
      <PageHeader
        title={
          tab === "permits"
            ? "Work Permits"
            : tab === "rain"
              ? "Rain & Delay Log"
              : tab === "linewalk"
                ? "Safety Line Walk"
                : "Safety Overview"
        }
        subtitle={
          tab === "permits"
            ? "High-risk permit register · ทะเบียนและสถิติใบอนุญาตทำงานความเสี่ยงสูง"
            : tab === "rain"
              ? "บันทึกเวลาฝนตกจริง · สถิติชั่วโมงสั่งหยุดงาน · หลักฐานประกอบการต่อรอง Delay (EOT Claim) กับ PM"
              : tab === "linewalk"
                ? "Line walk (EPS) · บันทึกการเดินตรวจความปลอดภัย · รายการข้อแก้ไขและมาตรการ"
                : "สถิติอุบัติเหตุจากรายงานผู้รับเหมา + EPS · Performance KPIs · แนวโน้มรายวัน/สัปดาห์/เดือน"
        }
        actions={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {(tab === "safety" || tab === "linewalk" || tab === "rain") && (
              <DateRangeFields from={from} to={to} maxDays={400} onChange={setRange} />
            )}
            {allCodes.length > 0 && (
              <ContractorFilterPopover
                items={filterItems}
                selectedCodes={selectedCodes}
                onChange={setContractors}
              />
            )}
            {tab === "linewalk" && (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<PictureAsPdfOutlinedIcon />}
                  onClick={() => {
                    const p = new URLSearchParams({ from, to });
                    if (selectedCodes.size < allCodes.length) p.set("contractors", [...selectedCodes].join(","));
                    window.open(`/safety/report?${p.toString()}`, "_blank", "noopener");
                  }}
                >
                  Export PDF
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<FileDownloadOutlinedIcon />}
                  onClick={handleExportCsv}
                  disabled={visibleRows.length === 0}
                >
                  Export CSV
                </Button>
              </Stack>
            )}
          </Stack>
        }
      />

      <ToggleButtonGroup
        exclusive
        size="small"
        value={tab}
        onChange={(_, v: SafetyTab | null) => v && setTab(v)}
        aria-label="Safety & Work Permits view"
        sx={{ mb: 2.5, bgcolor: "background.paper" }}
      >
        <ToggleButton value="safety" sx={{ textTransform: "none", fontWeight: 600, px: 2, gap: 1 }}>
          <HealthAndSafetyOutlinedIcon fontSize="small" />
          Safety Overview
        </ToggleButton>
        <ToggleButton value="linewalk" sx={{ textTransform: "none", fontWeight: 600, px: 2, gap: 1 }}>
          <DirectionsWalkOutlinedIcon fontSize="small" />
          Safety Line Walk
        </ToggleButton>
        <ToggleButton value="permits" sx={{ textTransform: "none", fontWeight: 600, px: 2, gap: 1 }}>
          <AssignmentOutlinedIcon fontSize="small" />
          Work Permits
        </ToggleButton>
        <ToggleButton value="rain" sx={{ textTransform: "none", fontWeight: 600, px: 2, gap: 1 }}>
          <ThunderstormOutlinedIcon fontSize="small" />
          สถิติฝนตก
        </ToggleButton>
      </ToggleButtonGroup>

      {tab === "permits" ? (
        <WorkPermitsView
          selectedContractorCodes={selectedCodes}
          defaultFrom={params.get("from") && ISO_DATE.test(params.get("from")!) ? params.get("from")! : todayIso()}
          defaultTo={params.get("to") && ISO_DATE.test(params.get("to")!) ? params.get("to")! : todayIso()}
        />
      ) : tab === "rain" ? (
        <RainLogView projectId={projectId ?? ""} from={from} to={to} />
      ) : tab === "linewalk" ? (
        <>
          {error ? (
            <QueryError error={error} onRetry={() => { void stats.refetch(); void findings.refetch(); }} />
          ) : null}

          {!s ? (
            <BlockSkeleton height={420} />
          ) : (
            <LineWalkTab
              s={s}
              colors={colors}
              visibleRows={visibleRows}
              removing={remove.isPending}
              from={from}
              to={to}
              onRangeChange={setRange}
              renumber={{ show: renumberNeeded, hint: renumberHint, pending: renumber.isPending, onClick: () => setRenumberOpen(true) }}
              onAdd={() => setEditing("new")}
              onEdit={setEditing}
              onDelete={setDeleteTarget}
            />
          )}
        </>
      ) : (
        <>
          {error ? (
            <QueryError error={error} onRetry={() => { void stats.refetch(); void findings.refetch(); }} />
          ) : null}

          {!s ? (
            <BlockSkeleton height={420} />
          ) : (
            <OverviewTab s={s} projectId={projectId} />
          )}
        </>
      )}

      {editing && projectId ? (
        <FindingDialog projectId={projectId} finding={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      ) : null}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete finding?"
        description={deleteTarget ? `รายการ ${findingTitle(deleteTarget)} จะถูกลบถาวร (เลขอื่นในสัปดาห์เดิมไม่เปลี่ยน — กด Renumber week เพื่อจัดเลขใหม่)` : undefined}
        loading={remove.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          remove.mutate(deleteTarget.id, {
            onSuccess: () => toast.success("ลบรายการแล้ว"),
            onSettled: () => setDeleteTarget(null),
          });
        }}
      />
      <ConfirmDialog
        open={renumberOpen}
        title={`Renumber week ${isoWeekLabel(from)}?`}
        description="เลขรายการของสัปดาห์นี้จะถูกจัดใหม่เป็น 1..N ตามวันที่ตรวจ — เลขที่เคยส่งในรายงานไปแล้วอาจเปลี่ยน"
        confirmLabel="Renumber"
        tone="warning"
        loading={renumber.isPending}
        onClose={() => setRenumberOpen(false)}
        onConfirm={() =>
          renumber.mutate(from, {
            onSuccess: (res) => toast.success(`จัดเลข ${isoWeekLabel(from)} ใหม่แล้ว (${res.data.count} รายการ)`),
            onSettled: () => setRenumberOpen(false),
          })
        }
      />
    </Box>
  );
}

