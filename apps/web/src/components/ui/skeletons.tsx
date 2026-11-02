import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

// Loading placeholders. Pass the height the content will have so the layout does not jump on load.
export function BlockSkeleton({ height, sx }: { height: number; sx?: object }) {
  return <Skeleton variant="rounded" height={height} sx={sx} />;
}

// A stack of row-height placeholders (lists, table bodies).
export function RowsSkeleton({ rows = 3, height = 44 }: { rows?: number; height?: number }) {
  return (
    <Stack spacing={1}>
      {Array.from({ length: rows }, (_, i) => (
        <BlockSkeleton key={i} height={height} />
      ))}
    </Stack>
  );
}
