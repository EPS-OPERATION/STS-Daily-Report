import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberOutlined";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { PERMIT_TYPES } from "@sts/shared";
import dayjs, { type Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BuildingSelect,
  ContractorBadge,
  useBuildings,
  useCreatePermit,
  useUpdatePermit,
} from "@/features/daily-reports/index.js";
import { useProjectContractors } from "@/features/projects/index.js";
import { getPermitIcon, usePermitTypes } from "@/features/permit-types/index.js";
import { HttpError } from "@/services/http/client.js";

export interface PermitEditItem {
  id: string;
  targetDate: string;
  buildingId: string;
  buildingCode?: string;
  buildingName?: string;
  permitType: string;
  otherLabel?: string | null;
  workers: number;
  highRisk: boolean;
  taskName?: string | null;
  supervisorName?: string | null;
  contractorCode?: string;
  contractorName?: string;
}

export function PermitEditDialog({
  open,
  projectId,
  permit,
  createOn,
  onClose,
}: {
  open: boolean;
  projectId: string;
  permit: PermitEditItem | null;
  /** Add mode (no `permit`): EPS adds a high-risk task for this date. */
  createOn?: string;
  onClose: () => void;
}) {
  const creating = !permit && Boolean(createOn);
  const contractors = useProjectContractors(projectId).data?.data ?? [];
  const createPermit = useCreatePermit(projectId);
  const [contractorId, setContractorId] = useState("");
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const buildings = useBuildings(projectId).data?.data ?? [];
  const updatePermit = useUpdatePermit(projectId);

  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [permitType, setPermitType] = useState<string>("hot_work");
  const { data: dynamicPermitTypes } = usePermitTypes(projectId);
  const permitTypesList = dynamicPermitTypes && dynamicPermitTypes.length > 0 ? dynamicPermitTypes : PERMIT_TYPES;
  const [otherLabel, setOtherLabel] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [workers, setWorkers] = useState<number>(1);
  const [highRisk, setHighRisk] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (permit) {
      setDate(dayjs(permit.targetDate));
      setPermitType(permit.permitType);
      setOtherLabel(permit.otherLabel ?? "");
      setBuildingId(permit.buildingId);
      setWorkers(permit.workers || 1);
      setHighRisk(Boolean(permit.highRisk));
      setTaskName(permit.taskName ?? "");
      setSupervisorName(permit.supervisorName ?? "");
      setErrorMsg(null);
    } else if (createOn) {
      setDate(dayjs(createOn));
      setPermitType("height");
      setOtherLabel("");
      setBuildingId("");
      setWorkers(1);
      setHighRisk(true);
      setTaskName("");
      setSupervisorName("");
      setContractorId("");
      setErrorMsg(null);
    }
  }, [permit, createOn]);

  if (!permit && !creating) return null;
  const saving = updatePermit.isPending || createPermit.isPending;

  const handleSave = () => {
    setErrorMsg(null);
    if (!date?.isValid()) {
      setErrorMsg("กรุณาระบุวันที่ที่ถูกต้อง");
      return;
    }
    if (creating && !contractorId) {
      setErrorMsg("กรุณาเลือกผู้รับเหมา");
      return;
    }
    if (!buildingId) {
      setErrorMsg("กรุณาเลือกอาคาร");
      return;
    }
    if (workers < 1) {
      setErrorMsg("จำนวนคนต้องมากกว่า 0");
      return;
    }
    if (permitType === "other" && !otherLabel.trim()) {
      setErrorMsg("กรุณาระบุรายละเอียดงานอันตรายเมื่อเลือกประเภท อื่นๆ");
      return;
    }
    if (highRisk) {
      if (!taskName.trim()) {
        setErrorMsg("งานความเสี่ยงสูงต้องระบุรายละเอียดงาน");
        return;
      }
      if (!supervisorName.trim()) {
        setErrorMsg("งานความเสี่ยงสูงต้องระบุผู้ควบคุมงาน (EPS)");
        return;
      }
    }

    const callbacks = {
      onSuccess: () => {
        toast.success(creating ? "เพิ่มงานความเสี่ยงสูงเรียบร้อยแล้ว" : "บันทึกข้อมูลใบอนุญาตทำงานเรียบร้อยแล้ว");
        onClose();
      },
      onError: (err: Error) => {
        const msg = err instanceof HttpError ? err.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล";
        setErrorMsg(msg);
        toast.error(msg);
      },
    };
    if (!permit) {
      createPermit.mutate(
        {
          contractorId,
          targetDate: date.format("YYYY-MM-DD"),
          buildingId,
          permitType: permitType as any,
          otherLabel: permitType === "other" ? otherLabel.trim() : null,
          workers: Number(workers),
          highRisk,
          taskName: taskName.trim() || null,
          supervisorName: supervisorName.trim() || null,
        },
        callbacks,
      );
      return;
    }
    updatePermit.mutate(
      {
        id: permit.id,
        targetDate: date.format("YYYY-MM-DD"),
        buildingId,
        permitType: permitType as any,
        otherLabel: permitType === "other" ? otherLabel.trim() : null,
        workers: Number(workers),
        highRisk,
        taskName: highRisk ? taskName.trim() : taskName.trim() || null,
        supervisorName: highRisk ? supervisorName.trim() : supervisorName.trim() || null,
      },
      callbacks,
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="sm"
      fullWidth
      aria-labelledby="permit-edit-title"
    >
      <DialogTitle id="permit-edit-title" sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <ConstructionOutlinedIcon color="primary" />
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
            {creating ? "เพิ่มงานความเสี่ยงสูง (EPS)" : "แก้ไขข้อมูลใบอนุญาตทำงาน (Work Permit)"}
          </Typography>
        </Stack>
        {creating ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            ใช้เมื่อผู้รับเหมาไม่ได้แจ้งหรือแจ้งผิด — รายการจะถูกบันทึกเป็นใบอนุญาตของผู้รับเหมารายนั้น
          </Typography>
        ) : null}
        {permit?.contractorCode ? (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.75 }}>
            <ContractorBadge code={permit.contractorCode} />
            <Typography variant="body2" color="text.secondary">
              {permit.contractorName || permit.contractorCode}
            </Typography>
          </Stack>
        ) : null}
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Stack spacing={2.5}>
          {errorMsg ? (
            <Typography variant="caption" sx={{ color: "error.main", bgcolor: "error.50", p: 1, borderRadius: 1 }}>
              {errorMsg}
            </Typography>
          ) : null}

          {creating ? (
            <FormControl size="small" fullWidth required>
              <InputLabel id="permit-contractor-label">ผู้รับเหมา</InputLabel>
              <Select
                labelId="permit-contractor-label"
                label="ผู้รับเหมา"
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value)}
              >
                {contractors.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.code} · {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}

          {/* Date & Workers */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <DatePicker
              label="วันที่ใช้งาน (Target Date)"
              value={date}
              onChange={setDate}
              slotProps={{ textField: { size: "small", fullWidth: true } }}
            />
            <TextField
              label="จำนวนคน (Headcount)"
              type="number"
              size="small"
              value={workers}
              onChange={(e) => setWorkers(Math.max(1, parseInt(e.target.value, 10) || 1))}
              inputProps={{ min: 1 }}
              sx={{ minWidth: 140 }}
            />
          </Stack>

          {/* Permit Type */}
          <FormControl size="small" fullWidth>
            <InputLabel id="permit-type-label">ประเภทใบอนุญาต (Permit Type)</InputLabel>
            <Select
              labelId="permit-type-label"
              label="ประเภทใบอนุญาต (Permit Type)"
              value={permitType}
              onChange={(e) => setPermitType(e.target.value)}
            >
              {permitTypesList.map((t) => {
                const Icon = getPermitIcon("iconKey" in t ? t.iconKey : t.code);
                return (
                  <MenuItem key={t.code} value={t.code}>
                    <Stack direction="row" spacing={1.25} alignItems="center">
                      <Icon sx={{ fontSize: 18, color: "warning.dark" }} />
                      <Typography variant="body2">{t.label}</Typography>
                      {t.labelTh && (
                        <Typography variant="caption" color="text.secondary">
                          ({t.labelTh})
                        </Typography>
                      )}
                    </Stack>
                  </MenuItem>
                );
              })}
            </Select>
            <FormHelperText>เลือกประเภทของใบอนุญาตทำงาน</FormHelperText>
          </FormControl>

          {permitType === "other" ? (
            <TextField
              label="ระบุงานอันตราย (Hazard Work Description)"
              size="small"
              fullWidth
              required
              value={otherLabel}
              onChange={(e) => setOtherLabel(e.target.value)}
              placeholder="เช่น งานเชื่อมใต้น้ำ หรือ งานสารเคมีอันตราย"
            />
          ) : null}

          {/* Building */}
          <BuildingSelect
            label="อาคาร / พื้นที่ทำงาน"
            buildings={buildings}
            value={buildingId}
            onChange={setBuildingId}
          />

          {/* High-Risk Tasks Section */}
          <Card
            variant="outlined"
            sx={{
              borderColor: highRisk ? "warning.main" : "divider",
              borderWidth: highRisk ? 2 : 1,
              bgcolor: highRisk ? "#FFFDF8" : "background.paper",
              transition: "all 0.2s ease",
            }}
          >
            <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={highRisk}
                    onChange={(e) => setHighRisk(e.target.checked)}
                    color="warning"
                  />
                }
                label={
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    {highRisk && <WarningAmberRoundedIcon sx={{ color: "warning.main", fontSize: 20 }} />}
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      เป็นงานที่มีความเสี่ยงสูง (High-Risk Task)
                    </Typography>
                  </Stack>
                }
              />

              {highRisk ? (
                <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    งานความเสี่ยงสูงจะแสดงในการ์ด High-Risk Tasks บนหน้า Safety &amp; Work Permits
                  </Typography>
                  <TextField
                    label="รายละเอียดงานความเสี่ยงสูง (Task Name)"
                    placeholder="เช่น งานติดตั้งโครงสร้างเหล็กระดับสูง"
                    size="small"
                    fullWidth
                    required
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                  />
                  <TextField
                    label="ผู้ควบคุมงาน EPS (Supervisor Name)"
                    placeholder="เช่น นายสมชาย ปลอดภัย"
                    size="small"
                    fullWidth
                    required
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                  />
                </Stack>
              ) : null}
            </CardContent>
          </Card>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          ยกเลิก
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={saving}
        >
          {saving ? "กำลังบันทึก..." : creating ? "เพิ่มงาน" : "บันทึกการแก้ไข"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
