import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { useState } from "react";
import { useContractors } from "../hooks/use-contractors.js";
import type { Contractor } from "../types/contractor.types.js";

const columns: GridColDef<Contractor>[] = [
  { field: "code", headerName: "Code", width: 160, resizable: false },
  { field: "name", headerName: "Name", flex: 1, minWidth: 220, resizable: false },
];

export function ContractorTable() {
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  const query = useContractors({ page: pagination.page + 1, pageSize: pagination.pageSize });

  if (query.isError) {
    return <Alert severity="error">{query.error instanceof Error ? query.error.message : "Failed to load contractors"}</Alert>;
  }

  return (
    <Box sx={{ height: 480, width: "100%" }}>
      <DataGrid
        rows={query.data?.data ?? []}
        columns={columns}
        rowCount={query.data?.meta.total ?? 0}
        loading={query.isLoading || query.isFetching}
        paginationMode="server"
        paginationModel={pagination}
        onPaginationModelChange={setPagination}
        pageSizeOptions={[10, 20, 50]}
        disableRowSelectionOnClick
      />
    </Box>
  );
}
