import AddIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HealthAndSafetyOutlinedIcon from "@mui/icons-material/HealthAndSafetyOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import dayjs from "dayjs";
import { EmptySection } from "@/components/ui/empty-state.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import { Panel } from "@/components/ui/panel.js";
import { ContractorBadge } from "@/features/contractors/index.js";
import { FindingPie } from "./safety-charts.js";
import { type SafetyFinding } from "../types/safety.types.js";
import type { SafetyStats } from "../types/safety.types.js";

export function LineWalkTab({
  s,
  colors,
  visibleRows,
  removing,
  onAdd,
  onEdit,
  onDelete,
}: {
  s: SafetyStats;
  colors: Map<string, string>;
  visibleRows: SafetyFinding[];
  removing: boolean;
  onAdd: () => void;
  onEdit: (finding: SafetyFinding) => void;
  onDelete: (finding: SafetyFinding) => void;
}) {
  return (
    <Stack spacing={2.5}>
          <Panel fill title="Finding for line walk" subtitle="แยกตามผู้รับเหมาในช่วงที่เลือก">
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FindingPie title="Unsafe Action" summary={s.unsafeAct} colors={colors} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FindingPie title="Unsafe Condition" summary={s.unsafeCondition} colors={colors} />
              </Grid>
            </Grid>
          </Panel>
    
          <Panel fill
            title="Issue Safety Line Walk"
            subtitle={`${visibleRows.length} รายการ · ${visibleRows.filter((r) => r.status === "open").length} ยังไม่ปิด`}
            actions={
              <Button startIcon={<AddIcon />} onClick={() => onAdd()}>
                Add line walk
              </Button>
            }
          >
            {visibleRows.length === 0 ? (
              <Box sx={{ p: 2 }}>
                <EmptySection
                  dense
                  icon={<HealthAndSafetyOutlinedIcon />}
                  title="ยังไม่มี Line walk ในช่วงนี้"
                  description="กด “Add line walk” เพื่อบันทึกสิ่งที่พบจากการเดินตรวจ"
                />
              </Box>
            ) : (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small" sx={{ minWidth: 1100, "& td": { verticalAlign: "top" } }}>
                  <TableHead>
                    <TableRow>
                      {["#", "Observations Identified", "Location", "Action to be taken", "Responsible", "Inspection", "Expect complete", "Finding", "Status", "Close", "Type", ""].map((h) => (
                        <TableCell key={h} sx={{ fontWeight: 700, bgcolor: "grey.50" }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visibleRows.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{r.itemNo}</TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>{r.observation}</TableCell>
                        <TableCell>
                          {r.buildingCode ?? "—"}
                          {r.locationDetail ? <Typography variant="caption" sx={{ display: "block" }}>{r.locationDetail}</Typography> : null}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 220 }}>{r.actionToBeTaken}</TableCell>
                        <TableCell>{r.contractorCode ? <ContractorBadge code={r.contractorCode} title={r.contractorName ?? undefined} /> : "—"}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{dayjs(r.inspectionDate).format("D/MMM/YY")}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{r.expectedCompleteDate ? dayjs(r.expectedCompleteDate).format("D/MMM/YY") : "—"}</TableCell>
                        <TableCell>
                          <Thumb src={r.findingPhotoUrl} />
                        </TableCell>
                        <TableCell>
                          {r.status === "done" ? <StatusChip status="completed" label="DONE" /> : <StatusChip status="attention" label="OPEN" />}
                        </TableCell>
                        <TableCell>
                          <Thumb src={r.closePhotoUrl} />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>{r.findingType === "unsafe_act" ? "Unsafe Act." : "Unsafe con."}</TableCell>
                        <TableCell sx={{ whiteSpace: "nowrap" }}>
                          <IconButton size="small" aria-label="Edit" onClick={() => onEdit(r)}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            aria-label="Delete"
                            disabled={removing}
                            onClick={() => onDelete(r)}
                          >
                            <DeleteOutlineOutlinedIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Panel>
        </Stack>
  );
}

function Thumb({ src }: { src: string | null }) {
  if (!src) return <Typography variant="caption" color="text.disabled">—</Typography>;
  return (
    <Box component="a" href={src} target="_blank" rel="noopener" sx={{ display: "block" }}>
      <Box component="img" src={src} alt="" sx={{ width: 96, height: 72, objectFit: "cover", borderRadius: 1, border: 1, borderColor: "divider" }} />
    </Box>
  );
}

