import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import ConstructionOutlinedIcon from "@mui/icons-material/ConstructionOutlined";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header.js";

export function PlaceholderPage({ title, blurb }: { title: string; blurb: string }) {
  return (
    <Box>
      <PageHeader title={title} />
      <Card>
        <CardContent sx={{ p: 4, textAlign: "center" }}>
          <Stack spacing={2} alignItems="center" sx={{ maxWidth: 480, mx: "auto" }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                bgcolor: "primary.light",
                color: "primary.dark",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ConstructionOutlinedIcon fontSize="large" />
            </Box>
            <Typography variant="h5">Module coming soon</Typography>
            <Typography variant="body1" color="text.secondary">
              {blurb}
            </Typography>
            <Button component={RouterLink} to="/" variant="outlined">
              Back to dashboard
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
