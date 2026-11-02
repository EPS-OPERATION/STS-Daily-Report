import EditOutlined from "@mui/icons-material/EditOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { useMemo } from "react";
import { StatusChip } from "@/components/ui/status-chip.js";
import type { Contractor, ContractorListResponse } from "../types/contractor.types.js";

// Company list for EPS admins: click a row for its details and users, Edit to change it.
export function ContractorTable({
  data,
  loading,
  error,
  pagination,
  onPaginationChange,
  onEdit,
  onOpen,
}: {
  data?: ContractorListResponse;
  loading: boolean;
  error: unknown;
  pagination: GridPaginationModel;
  onPaginationChange: (model: GridPaginationModel) => void;
  onEdit: (contractor: Contractor) => void;
  onOpen: (contractor: Contractor) => void;
}) {
  const columns = useMemo<GridColDef<Contractor>[]>(
    () => [
      {
        field: "code",
        headerName: "Code",
        width: 120,
        renderCell: ({ row }) => (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ height: "100%", fontWeight: 700 }}>
            <Box component="span" sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: row.color ?? "grey.400", flexShrink: 0 }} />
            <span>{row.code}</span>
          </Stack>
        ),
      },
      { field: "name", headerName: "Company name", flex: 1, minWidth: 220 },
      { field: "contactName", headerName: "Contact person", flex: 0.7, minWidth: 160, valueGetter: (v: string | null) => v ?? "—" },
      { field: "contactPhone", headerName: "Phone", width: 150, valueGetter: (v: string | null) => v ?? "—" },
      {
        field: "active",
        headerName: "Status",
        width: 140,
        renderCell: ({ row }) =>
          !row.isContractor ? (
            <StatusChip status="idle" label="Owner (EPS)" />
          ) : row.active ? (
            <StatusChip status="active" label="Active" />
          ) : (
            <StatusChip status="blocked" label="Inactive" />
          ),
      },
      {
        field: "actions",
        headerName: "",
        width: 100,
        sortable: false,
        renderCell: ({ row }) => (
          <Button
            size="small"
            startIcon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(row);
            }}
          >
            Edit
          </Button>
        ),
      },
    ],
    [onEdit],
  );

  if (error) {
    return <Alert severity="error">{error instanceof Error ? error.message : "Failed to load companies"}</Alert>;
  }

  return (
    <Box sx={{ height: 560, width: "100%" }}>
      <DataGrid
        rows={data?.data ?? []}
        columns={columns}
        rowCount={data?.meta.total ?? 0}
        loading={loading}
        paginationMode="server"
        paginationModel={pagination}
        onPaginationModelChange={onPaginationChange}
        pageSizeOptions={[10, 20, 50]}
        disableRowSelectionOnClick
        onRowClick={({ row }) => onOpen(row)}
        sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
      />
    </Box>
  );
}
