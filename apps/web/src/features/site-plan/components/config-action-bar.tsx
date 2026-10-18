import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SiteMapEditor } from "../hooks/use-site-map-editor.js";

export function ConfigActionBar({ ed }: { ed: SiteMapEditor }) {
  const { saving, dirty, discard, save } = ed;
  return (
    <Box
      sx={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: (t) => t.zIndex.appBar,
        bgcolor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
        px: 3,
        py: 1.25,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ maxWidth: 1600, ml: "auto" }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {dirty ? "Unsaved changes" : "บันทึกแล้ว"}
          </Typography>
          {dirty ? (
            <Typography variant="caption" color="warning.dark">
              ● มีการแก้ไขที่ยังไม่บันทึก
            </Typography>
          ) : null}
        </Box>
        <Button variant="outlined" color="inherit" disabled={!dirty || saving} onClick={discard}>
          Cancel
        </Button>
        <Button disabled={!dirty || saving} onClick={() => void save(false)}>
          Save
        </Button>
        <Button variant="outlined" disabled={!dirty || saving} onClick={() => void save(true)}>
          Save &amp; Add Another
        </Button>
      </Stack>
    </Box>
  );
}
