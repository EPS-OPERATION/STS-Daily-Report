import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
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
import { useCurrentProject } from "@/features/projects/index.js";
import { useChangeUserRole, useChangeUserStatus, useIssueResetLink, useUsers } from "../hooks/use-users.js";
import type { ManagedUser, UserStatus } from "../types/user.types.js";
import { ROLE_LABEL } from "../utils/role-label.js";
import { resetMessage } from "../utils/reset-message.js";
import { CreateUserDialog } from "./create-user-dialog.js";
import { LinkContractorDialog } from "./link-contractor-dialog.js";
import { UserDecisionDialog } from "./user-decision-dialog.js";

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
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const reset = useIssueResetLink();
  const changeRole = useChangeUserRole();
  const changeStatus = useChangeUserStatus();
  const mutating = changeRole.isPending || changeStatus.isPending;
  useEffect(() => { const timer = window.setTimeout(() => { setDebounced(search); setPagination((p) => ({ ...p, page: 0 })); }, 250); return () => window.clearTimeout(timer); }, [search]);
  // eps_site only ever sees the pending approval queue; admin tabs stay hidden.
  useEffect(() => { if (me.isSuccess && !isAdmin && status !== "pending") setStatus("pending"); }, [isAdmin, me.isSuccess, status]);
  const users = useUsers({ status, ...pagination, page: pagination.page + 1, search: debounced, projectId: projectId ?? undefined });
  const actionsWidth = status === "pending" ? 180 : status === "active" && isAdmin ? 560 : 170;
  const openLink = (row: ManagedUser) => setLinkTarget(row);
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
    <PageHeader
      title="User management"
      subtitle="Review registrations, link companies, and manage accounts"
      actions={isAdmin ? <Button variant="contained" startIcon={<PersonAddOutlinedIcon />} onClick={() => setCreating(true)}>Add user</Button> : undefined}
    />
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
    {creating && <CreateUserDialog projectId={projectId ?? undefined} onClose={() => setCreating(false)} />}
    {decision && <UserDecisionDialog key={`${decision.user.id}-${decision.action}`} {...decision} projectId={projectId ?? undefined} onClose={() => setDecision(null)} />}
    {linkTarget && <LinkContractorDialog key={linkTarget.id} user={linkTarget} projectId={projectId ?? undefined} onClose={() => setLinkTarget(null)} />}
    <FormDialog open={Boolean(resetUser)} title="Reset password" onClose={() => { setResetUser(null); reset.reset(); }} busy={reset.isPending} actions={<><Button color="inherit" disabled={reset.isPending} onClick={() => { setResetUser(null); reset.reset(); }}>Close</Button>{!reset.data && <Button disabled={reset.isPending || !resetUser} onClick={() => resetUser && reset.mutate(resetUser.id)}>{reset.isPending ? "Generating…" : "Generate link"}</Button>}</>}><Stack spacing={2} sx={{ pt: 1 }}>
        <Typography>{resetUser?.email}</Typography>
        {reset.isError && <Alert severity="error">{reset.error.message}</Alert>}
        {reset.data && resetUser ? (() => {
          // Formal Thai + English message: copy it, or open the email app with everything filled in.
          const msg = resetMessage(resetUser, reset.data.data);
          const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setCopied(true); setCopyError(false); } catch { setCopyError(true); } };
          return <>
            <TextField label="One-time reset link" value={reset.data.data.url} slotProps={{ input: { readOnly: true } }} multiline />
            <Typography color="text.secondary">Expires {new Date(reset.data.data.expiresAt).toLocaleString()}. Generating another link invalidates the previous one.</Typography>
            <TextField label={`Message — ${msg.subject}`} value={msg.body} slotProps={{ input: { readOnly: true } }} multiline minRows={6} maxRows={12} />
            {copyError && <Alert severity="warning">Clipboard unavailable. Select and copy the message above.</Alert>}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="contained" component="a" href={msg.mailto}>Open in email</Button>
              <Button variant="outlined" onClick={() => void copy(`${msg.subject}

${msg.body}`)}>{copied ? "Copied" : "Copy message"}</Button>
              <Button onClick={() => void copy(reset.data!.data.url)}>Copy link only</Button>
            </Stack>
          </>;
        })() : <Typography color="text.secondary">Generate a link valid for 60 minutes. The user chooses their password; existing sessions are revoked when the password is changed.</Typography>}
      </Stack></FormDialog>
  </Box>;
}
