import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material";
import type { ReactNode } from "react";
import { PageBreadcrumb, type BreadcrumbItem } from "@/components/shared/page-breadcrumb.js";

export function CompactPageHeader({
  icon,
  title,
  items,
  actions,
  sx,
}: {
  icon: ReactNode;
  title: string;
  items: BreadcrumbItem[];
  actions?: ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={2}
      sx={[{ flexShrink: 0, mb: 2 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <Stack spacing={0} sx={{ minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
          {icon}
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {title}
          </Typography>
        </Stack>
        <PageBreadcrumb items={items} />
      </Stack>
      {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
    </Stack>
  );
}
