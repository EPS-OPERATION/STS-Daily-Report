import { type ReactNode } from "react";
import { EmptySection } from "@/components/ui/empty-state.js";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type View = "requests" | "plan";

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Box>
      <Stack direction="row" alignItems="baseline" spacing={2} sx={{ mb: 1 }}>
        <Typography variant="h4">{title}</Typography>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

export function SimpleTable({
  head,
  rows,
  empty,
  emptyIcon,
}: {
  head: string[];
  rows: { key: string; tone?: "error" | "warning"; cells: ReactNode[] }[];
  empty: string;
  emptyIcon?: ReactNode;
}) {
  if (rows.length === 0) {
    return <EmptySection dense icon={emptyIcon ?? <InboxOutlinedIcon />} title={empty} />;
  }
  return (
    <Box sx={{ overflowX: "auto", border: 1, borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}>
      <Table size="small" sx={{ minWidth: 640 }}>
        <TableHead>
          <TableRow>
            {head.map((h) => (
              <TableCell key={h} sx={{ color: "text.secondary", bgcolor: "grey.50" }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.key} sx={{ bgcolor: r.tone === "error" ? "error.light" : r.tone === "warning" ? "warning.light" : undefined }}>
              {r.cells.map((c, i) => (
                <TableCell key={i}>{c}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
