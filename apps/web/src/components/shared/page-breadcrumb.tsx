import Link from "@mui/material/Link";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function PageBreadcrumb({ items, sx }: { items: BreadcrumbItem[]; sx?: SxProps<Theme> }) {
  return (
    <Breadcrumbs aria-label="breadcrumb" sx={[{ flexShrink: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {items.map((item, index) =>
        item.to && index < items.length - 1 ? (
          <Link key={item.label} component={RouterLink} to={item.to} underline="hover" color="inherit" variant="body2">
            {item.label}
          </Link>
        ) : (
          <Typography key={item.label} color="text.primary" variant="body2">
            {item.label}
          </Typography>
        ),
      )}
    </Breadcrumbs>
  );
}
