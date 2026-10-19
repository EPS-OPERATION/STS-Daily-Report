import AddOutlined from "@mui/icons-material/AddOutlined";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import type { GridPaginationModel } from "@mui/x-data-grid";
import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header.js";
import { useCurrentProject } from "@/features/projects/index.js";
import { ContractorDialog } from "@/features/contractors/components/contractor-form.js";
import { ContractorTable } from "@/features/contractors/components/contractor-table.js";
import { useContractors } from "@/features/contractors/hooks/use-contractors.js";
import type { Contractor } from "@/features/contractors/types/contractor.types.js";

export function ContractorsPage() {
  const { projectId } = useCurrentProject();
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 20 });
  const query = useContractors({ page: pagination.page + 1, pageSize: pagination.pageSize, projectId: projectId ?? undefined });
  // undefined = closed, null = adding, a row = editing
  const [editing, setEditing] = useState<Contractor | null | undefined>(undefined);
  const usedColors = (query.data?.data ?? []).flatMap((c) => (c.color ? [c.color] : []));

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title="Contractors"
        subtitle="บริษัทในโครงการ — เพิ่ม แก้ไขข้อมูลติดต่อ สีบนผัง หรือปิดการใช้งาน"
        actions={
          <Button startIcon={<AddOutlined />} onClick={() => setEditing(null)} disabled={!projectId}>
            Add company
          </Button>
        }
      />
      <ContractorTable
        data={query.data}
        loading={query.isLoading || query.isFetching}
        error={query.isError ? query.error : null}
        pagination={pagination}
        onPaginationChange={setPagination}
        onEdit={setEditing}
      />
      <ContractorDialog open={editing !== undefined} contractor={editing} usedColors={usedColors} onClose={() => setEditing(undefined)} />
    </Stack>
  );
}
