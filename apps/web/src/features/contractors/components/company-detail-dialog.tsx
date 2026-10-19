import EditOutlined from "@mui/icons-material/EditOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import { FormDialog } from "@/components/ui/form-dialog.js";
import { RowsSkeleton } from "@/components/ui/skeletons.js";
import { StatusChip } from "@/components/ui/status-chip.js";
import { useCompanyUsers } from "../hooks/use-company-users.js";
import type { CompanyUser, Contractor } from "../types/contractor.types.js";

const ROLE: Record<CompanyUser["role"], string> = { contractor: "ผู้รับเหมา", eps_site: "EPS Site", eps_admin: "EPS Admin" };

function UserState({ user }: { user: CompanyUser }) {
  if (user.status === "pending") return <StatusChip status="pending" label="Waiting approval" />;
  if (user.status === "rejected") return <StatusChip status="rejected" label="Rejected" />;
  if (user.status === "disabled") return <StatusChip status="blocked" label="Disabled" />;
  return user.membershipCount > 0 ? <StatusChip status="active" label="Linked" /> : <StatusChip status="attention" label="Not linked" />;
}

// One company at a glance: its details and every login that belongs to it or asked for it at sign-up.
export function CompanyDetailDialog({
  company,
  projectId,
  onClose,
  onEdit,
}: {
  company: Contractor;
  projectId?: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const users = useCompanyUsers(company.id, projectId);
  const rows = users.data?.data ?? [];
  const unlinked = rows.filter((u) => u.status === "active" && u.membershipCount === 0).length;
  const info: [string, string][] = [
    ["Company name", company.name],
    ["Contact person", company.contactName ?? "—"],
    ["Phone", company.contactPhone ?? "—"],
  ];

  return (
    <FormDialog
      open
      maxWidth="md"
      title={
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Box component="span" sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: company.color ?? "grey.400", flexShrink: 0 }} />
          <span>{company.code}</span>
          {!company.isContractor ? (
            <StatusChip status="idle" label="Owner (EPS)" />
          ) : company.active ? (
            <StatusChip status="active" label="Active" />
          ) : (
            <StatusChip status="blocked" label="Inactive" />
          )}
        </Stack>
      }
      onClose={onClose}
      actions={
        <>
          <Button color="inherit" onClick={onClose}>
            Close
          </Button>
          <Button startIcon={<EditOutlined />} onClick={onEdit}>
            Edit company
          </Button>
        </>
      }
    >
      <Stack spacing={2.5}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
          {info.map(([label, value]) => (
            <Box key={label}>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
        <Divider />
        <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={2}>
          <Typography variant="subtitle2">
            Users {users.isSuccess ? `(${rows.length})` : ""}
          </Typography>
          <Button size="small" component={RouterLink} to="/admin/users">
            Open User management
          </Button>
        </Stack>
        {unlinked > 0 ? (
          <Alert severity="warning">
            {unlinked} คนขอเข้าบริษัทนี้แต่ยังไม่ได้ผูก — ไปที่ User management → Link contractor เพื่อให้ส่งรายงานได้
          </Alert>
        ) : null}
        {users.isError ? (
          <Alert severity="error">{users.error instanceof Error ? users.error.message : "Failed to load users"}</Alert>
        ) : users.isLoading ? (
          <RowsSkeleton rows={3} />
        ) : rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            ยังไม่มีผู้ใช้ของบริษัทนี้
          </Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Since</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell sx={{ fontWeight: 600 }}>{u.username ?? "—"}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{ROLE[u.role]}</TableCell>
                    <TableCell>
                      <UserState user={u} />
                    </TableCell>
                    <TableCell>{new Date(u.createdAt).toLocaleDateString("th-TH")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Stack>
    </FormDialog>
  );
}
