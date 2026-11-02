import { useState } from "react";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  useCreatePermitType,
  useDeletePermitType,
  usePermitTypes,
  useUpdatePermitType,
} from "../hooks/use-permit-types.js";
import { PERMIT_ICON_OPTIONS, getPermitIcon } from "./permit-icons.js";

interface PermitTypeManageDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function PermitTypeManageDialog({ open, onClose, projectId }: PermitTypeManageDialogProps) {
  const { data: types, isLoading, error } = usePermitTypes(projectId, true);
  const createMutation = useCreatePermitType(projectId);
  const updateMutation = useUpdatePermitType(projectId);
  const deleteMutation = useDeletePermitType(projectId);

  const [isAdding, setIsAdding] = useState(false);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [labelTh, setLabelTh] = useState("");
  const [iconKey, setIconKey] = useState("tools");
  const [sortOrder, setSortOrder] = useState<number>(100);
  const [actionError, setActionError] = useState<string | null>(null);

  const resetAddForm = () => {
    setCode("");
    setLabel("");
    setLabelTh("");
    setIconKey("tools");
    setSortOrder(100);
    setIsAdding(false);
    setActionError(null);
  };

  const handleCreate = async () => {
    setActionError(null);
    const cleanCode = code.trim().toLowerCase().replace(/\s+/g, "_");
    if (!cleanCode) {
      setActionError("กรุณาระบุรหัสประเภท (Code)");
      return;
    }
    if (!label.trim()) {
      setActionError("กรุณาระบุชื่อภาษาอังกฤษ (Label EN)");
      return;
    }
    if (!labelTh.trim()) {
      setActionError("กรุณาระบุชื่อภาษาไทย (Label TH)");
      return;
    }

    try {
      await createMutation.mutateAsync({
        code: cleanCode,
        label: label.trim(),
        labelTh: labelTh.trim(),
        iconKey,
        sortOrder: Number(sortOrder) || 100,
        isActive: true,
      });
      resetAddForm();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเพิ่มประเภทใบอนุญาต");
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, input: { isActive: !currentStatus } });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "ไม่สามารถเปลี่ยนสถานะได้");
    }
  };

  const handleDelete = async (id: string, labelText: string) => {
    if (!window.confirm(`ต้องการลบประเภทใบอนุญาต "${labelText}" ใช่หรือไม่?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "ไม่สามารถลบประเภทใบอนุญาตได้");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            จัดการประเภทใบอนุญาต (Permit Types)
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            กำหนดประเภทใบอนุญาตสำหรับโครงการนี้ ประเภทที่เปิดใช้งานจะไปแสดงในแบบฟอร์มขอใบอนุญาตของผู้รับเหมา
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        {actionError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
            {actionError}
          </Alert>
        )}

        {/* Add new button or form */}
        {!isAdding ? (
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => setIsAdding(true)}
              sx={{ fontWeight: 600, textTransform: "none", borderRadius: 1.5 }}
            >
              เพิ่มประเภทใบอนุญาตใหม่
            </Button>
          </Box>
        ) : (
          <Card variant="outlined" sx={{ mb: 3, bgcolor: "grey.50", borderColor: "primary.light" }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: "primary.main" }}>
                เพิ่มประเภทใบอนุญาตใหม่ (New Permit Type)
              </Typography>
              <Stack spacing={2}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    label="รหัส (Code ภาษาอังกฤษพิมพ์เล็ก)"
                    placeholder="เช่น excavation, hot_work"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    size="small"
                    fullWidth
                    required
                    helperText="ใช้เป็นรหัสอ้างอิง ห้ามซ้ำ (ตัวพิมพ์เล็ก/ขีดล่าง)"
                  />
                  <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 200 } }}>
                    <InputLabel id="select-icon-label">ไอคอน</InputLabel>
                    <Select
                      labelId="select-icon-label"
                      value={iconKey}
                      label="ไอคอน"
                      onChange={(e) => setIconKey(e.target.value)}
                    >
                      {PERMIT_ICON_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <MenuItem key={opt.key} value={opt.key}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Icon fontSize="small" color="primary" />
                              <span>{opt.label}</span>
                            </Stack>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    label="ชื่อภาษาอังกฤษ (English Label)"
                    placeholder="เช่น Excavation & Trenching"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    size="small"
                    fullWidth
                    required
                  />
                  <TextField
                    label="ชื่อภาษาไทย (Thai Label)"
                    placeholder="เช่น งานขุดดิน/งานแนวท่อ"
                    value={labelTh}
                    onChange={(e) => setLabelTh(e.target.value)}
                    size="small"
                    fullWidth
                    required
                  />
                  <TextField
                    label="ลำดับ (Sort)"
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    size="small"
                    sx={{ width: { xs: "100%", sm: 110 } }}
                  />
                </Stack>

                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Button
                    variant="text"
                    onClick={resetAddForm}
                    size="small"
                    sx={{ textTransform: "none" }}
                  >
                    ยกเลิก
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    size="small"
                    sx={{ fontWeight: 600, textTransform: "none" }}
                  >
                    {createMutation.isPending ? "กำลังบันทึก..." : "บันทึกประเภทใหม่"}
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* Existing types list */}
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          รายการประเภทใบอนุญาตปัจจุบัน ({types?.length ?? 0} ประเภท)
        </Typography>

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress size={32} />
          </Box>
        ) : error ? (
          <Alert severity="error">ไม่สามารถโหลดรายการประเภทใบอนุญาตได้</Alert>
        ) : (
          <Stack spacing={1}>
            {types?.map((item) => {
              const Icon = getPermitIcon(item.iconKey);
              return (
                <Box
                  key={item.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 1.5,
                    borderRadius: 1.5,
                    border: "1px solid",
                    borderColor: item.isActive ? "divider" : "grey.200",
                    bgcolor: item.isActive ? "background.paper" : "grey.50",
                    opacity: item.isActive ? 1 : 0.65,
                    transition: "all 0.15s ease",
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                      sx={{
                        p: 0.75,
                        borderRadius: 1,
                        bgcolor: item.isActive ? "primary.50" : "grey.100",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon sx={{ color: item.isActive ? "primary.main" : "text.disabled", fontSize: 22 }} />
                    </Box>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {item.label}
                        </Typography>
                        <Chip
                          label={item.code}
                          size="small"
                          sx={{ height: 20, fontSize: "0.7rem", bgcolor: "grey.100" }}
                        />
                        {!item.isActive && (
                          <Chip
                            label="ปิดใช้งาน"
                            size="small"
                            color="default"
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        )}
                      </Stack>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {item.labelTh} · ลำดับ: {item.sortOrder}
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {item.isActive ? "เปิดใช้งาน" : "ปิด"}
                      </Typography>
                      <Switch
                        size="small"
                        checked={item.isActive}
                        onChange={() => handleToggleActive(item.id, item.isActive)}
                        disabled={updateMutation.isPending}
                      />
                    </Stack>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(item.id, item.label)}
                      title="ลบประเภทใบอนุญาต"
                      disabled={deleteMutation.isPending}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined" sx={{ textTransform: "none" }}>
          ปิดหน้าต่าง
        </Button>
      </DialogActions>
    </Dialog>
  );
}
