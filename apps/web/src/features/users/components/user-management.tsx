import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { USER_ROLES, isEpsStaff, type UserRole } from "@sts/shared";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header.js";
import { QueryError } from "@/components/ui/query-error.js";
import { FormDialog } from "@/components/ui/form-dialog.js";
import { useMe } from "@/features/auth/index.js";
import { ContractorPicker } from "@/features/auth/components/contractor-picker.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { useChangeUserRole, useChangeUserStatus, useIssueResetLink, useLinkUser, useUsers } from "../hooks/use-users.js";
import type { ManagedUser, UserStatus } from "../types/user.types.js";
import { UserDecisionDialog } from "./user-decision-dialog.js";

const ROLE_LABEL: Record<UserRole, string> = {
  contractor: "ผู้รับเหมา",
  eps_site: "EPS หน้างาน",
  eps_admin: "EPS ผู้ดูแลระบบ",
};

export function UserManagement() {
  const me = useMe();
  const isAdmin = me.data?.data.user.role === "eps_admin";
  const myId = me.data?.data.user.id;
  const { projectId } = useCurrentProject();
  const [status, setStatus] = useState<UserStatus>("pending");
  const [pagination, setPagination] = useState({ page: 0, pageSize: 20 });
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [decision, setDecision] = useState<{ user: ManagedUser; action: "approve" | "reject" } | null>(null);
  const [resetUser, setResetUser] = useState<ManagedUser | null>(null);
  const [linkTarget, setLinkTarget] = useState<ManagedUser | null>(null);
  const [linkContractorId, setLinkContractorId] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const reset = useIssueResetLink();
  const link = useLinkUser();
  const changeRole = useChangeUserRole();
  const changeStatus = useChangeUserStatus();
  const mutating = changeRole.isPending || changeStatus.isPending || link.isPending;
  useEffect(() => { const timer = window.setTimeout(() => { setDebounced(search); setPagination((p) => ({ ...p, page: 0 })); }, 250); return () => window.clearTimeout(timer); }, [search]);
  // eps_site only ever sees the pending approval queue; admin tabs stay hidden.
  useEffect(() => { if (me.isSuccess && !isAdmin && status !== "pending") setStatus("pending"); }, [isAdmin, me.isSuccess, status]);
  const users = useUsers({ status, ...pagination, page: pagination.page + 1, search: debounced, projectId: projectId ?? undefined });
  const actionsWidth = status === "pending" ? 180 : status === "active" && isAdmin ? 560 : 170;
  const openLink = (row: ManagedUser) => { link.reset(); setLinkContractorId(""); setLinkTarget(row); };
  const columns: GridColDef<ManagedUser>[] = [
    { field: "email", headerName: "Email", flex: 1, minWidth: 210 },
    { field: "username", headerName: "Username", width: 150 },
    { field: "role", headerName: "Role", width: 150, valueGetter: (_, row) => ROLE_LABEL[row.role] },
    { field: "company", headerName: "Requested contractor / company", flex: 1, minWidth: 220, valueGetter: (_, row) => row.requestedContractorName ?? row.requestedCompanyName ?? (isEpsStaff(row.role) ? "EPS staff" : row.membershipCount === 0 && row.role === "contractor" && row.status === "active" ? "ยังไม่ผูกผู้รับเหมา" : "Legacy account") },
    { field: "createdAt", headerName: "Requested date", width: 170, valueFormatter: (value: string) => new Date(value).toLocaleString("th-TH") },
    ...(status === "rejected" ? [{ field: "rejectionReason", headerName: "Reason", flex: 1, minWidth: 160 }] : []),
    { field: "actions", headerName: "Actions", sortable: false, filterable: false, width: actionsWidth, renderCell: ({ row }) => <Stack direction="row" spacing={1} sx={{ alignItems: "center", height: "100%" }}>
      {status === "pending" ? <><Button aria-label={`Approve ${row.username ?? row.email}`} onClick={() => setDecision({ user: row, action: "approve" })}>Approve</Button><Button color="error" aria-label={`Reject ${row.username ?? row.email}`} onClick={() => setDecision({ user: row, action: "reject" })}>Reject</Button></> : status === "active" ? <>
        {row.role === "contractor" && row.membershipCount === 0 ? <Button variant="outlined" aria-label={`Link ${row.username ?? row.email}`} disabled={mutating} onClick={() => openLink(row)}>Link contractor</Button> : null}
        {isAdmin ? <Button variant="text" aria-label={`Reset password for ${row.username ?? row.email}`} onClick={() => { reset.reset(); setCopied(false); setCopyError(false); setResetUser(row); }}>Reset password</Button> : null}
        {isAdmin && row.id !== myId ? <>
          <Select
            size="small"
            value={row.role}
            disabled={mutating}
            onChange={(e) => changeRole.mutate({ id: row.id, role: e.target.value as UserRole })}
            inputProps={{ "aria-label": `Role for ${row.username ?? row.email}` }}
            sx={{ minWidth: 150 }}
          >
            {USER_ROLES.map((r) => <MenuItem key={r} value={r}>{ROLE_LABEL[r]}</MenuItem>)}
          </Select>
          <Button color="error" disabled={mutating} onClick={() => changeStatus.mutate({ id: row.id, status: "disabled" })}>Disable</Button>
        </> : null}
      </> : status === "disabled" ? (isAdmin && row.id !== myId ? <Button disabled={mutating} onClick={() => changeStatus.mutate({ id: row.id, status: "active" })}>Reactivate</Button> : null) : null}
    </Stack> },
  ];
  const mutateError = changeRole.error ?? changeStatus.error;
  return <Box>
    <PageHeader title="User management" subtitle="Review registrations, link companies, and manage accounts" />
    <Stack spacing={2}>
      <Tabs value={status} onChange={(_, value: UserStatus) => { setStatus(value); setPagination((p) => ({ ...p, page: 0 })); }} aria-label="User status" variant="scrollable">
        <Tab label="Pending registrations" value="pending" />
        {isAdmin ? <Tab label="Active users" value="active" /> : null}
        {isAdmin ? <Tab label="Disabled" value="disabled" /> : null}
        {isAdmin ? <Tab label="Rejected" value="rejected" /> : null}
      </Tabs>
      <TextField label="Search users" value={search} onChange={(e) => setSearch(e.target.value)} size="small" sx={{ maxWidth: 400 }} />
      {users.isError && <QueryError error={users.error as Error} onRetry={() => void users.refetch()} />}
      {mutateError && <Alert severity="error">{mutateError.message}</Alert>}
      <Box sx={{ height: 520, width: "100%" }}><DataGrid rows={users.data?.data ?? []} columns={columns} rowCount={users.data?.meta.total ?? 0} loading={users.isFetching}
        paginationMode="server" paginationModel={pagination} onPaginationModelChange={setPagination} pageSizeOptions={[20, 50, 100]} disableRowSelectionOnClick disableColumnMenu
        localeText={{ noRowsLabel: status === "pending" ? "No registrations awaiting approval" : "No users found" }} /></Box>
    </Stack>
    {decision && <UserDecisionDialog key={`${decision.user.id}-${decision.action}`} {...decision} projectId={projectId ?? undefined} onClose={() => setDecision(null)} />}
    <FormDialog open={Boolean(linkTarget)} title="Link contractor" onClose={() => { setLinkTarget(null); link.reset(); }} busy={link.isPending} actions={<>
        <Button color="inherit" disabled={link.isPending} onClick={() => { setLinkTarget(null); link.reset(); }}>Cancel</Button>
        <Button variant="contained" disabled={!linkContractorId || link.isPending} onClick={() => linkTarget && link.mutate({ id: linkTarget.id, contractorId: linkContractorId, projectId: projectId ?? undefined }, { onSuccess: () => setLinkTarget(null) })}>{link.isPending ? "Linking…" : "Link contractor"}</Button>
      </>}><Stack spacing={2} sx={{ pt: 1 }}>
        <Typography>{linkTarget?.email} · {linkTarget?.username}</Typography>
        {link.isError && <Alert severity="error">{link.error.message}</Alert>}
        <ContractorPicker value={linkContractorId} onChange={setLinkContractorId} allowOther={false} projectId={projectId ?? undefined} disabled={link.isPending} />
        <Typography color="text.secondary">Links this account to the selected contractor in the current project. The user can then submit daily reports.</Typography>
      </Stack></FormDialog>
    <FormDialog open={Boolean(resetUser)} title="Reset password" onClose={() => { setResetUser(null); reset.reset(); }} busy={reset.isPending} actions={<><Button color="inherit" disabled={reset.isPending} onClick={() => { setResetUser(null); reset.reset(); }}>Close</Button>{!reset.data && <Button disabled={reset.isPending || !resetUser} onClick={() => resetUser && reset.mutate(resetUser.id)}>{reset.isPending ? "Generating…" : "Generate link"}</Button>}</>}><Stack spacing={2} sx={{ pt: 1 }}>
        <Typography>{resetUser?.email}</Typography>
        {reset.isError && <Alert severity="error">{reset.error.message}</Alert>}
        {reset.data ? <>
          <TextField label="One-time reset link" value={reset.data.data.url} slotProps={{ input: { readOnly: true } }} multiline />
          <Typography color="text.secondary">Expires {new Date(reset.data.data.expiresAt).toLocaleString()}. Send this link privately to the user via LINE. Generating another link invalidates the previous one.</Typography>
          {copyError && <Alert severity="warning">Clipboard unavailable. Select and copy the link above.</Alert>}
          <Button onClick={async () => { try { await navigator.clipboard.writeText(reset.data!.data.url); setCopied(true); } catch { setCopyError(true); } }}>{copied ? "Copied" : "Copy link"}</Button>
        </> : <Typography color="text.secondary">Generate a link valid for 60 minutes. The user chooses their password; existing sessions are revoked when the password is changed.</Typography>}
      </Stack></FormDialog>
  </Box>;
}
