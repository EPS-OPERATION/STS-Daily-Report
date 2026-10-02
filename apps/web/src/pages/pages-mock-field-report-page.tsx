import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useState } from "react";

const mockActivities = [
  {
    title: "Install pipe supports",
    facility: "Boiler",
    workers: 8,
    status: "Active",
  },
  {
    title: "Crane lift preparation",
    facility: "TG Building",
    workers: 4,
    status: "Planned",
  },
  {
    title: "Material delivery",
    facility: "Biomass Transport",
    workers: 2,
    status: "Completed",
  },
];

export function PagesMockFieldReportPage() {
  const [shift, setShift] = useState<"morning" | "evening">("evening");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  return (
    <Box sx={{ maxWidth: 760, mx: "auto", pb: 4 }}>
      <Card sx={{ bgcolor: "navy.dark", color: "common.white", mb: 2 }}>
        <CardContent>
          <Typography variant="caption" color="inherit">
            STS Project · UME · 02 Oct 2026
          </Typography>
          <Typography variant="h4" color="inherit" sx={{ mt: 0.5, mb: 2 }}>
            Daily Report
          </Typography>
          <ToggleButtonGroup
            value={shift}
            exclusive
            fullWidth
            aria-label="Report shift"
            onChange={(_, value: "morning" | "evening" | null) =>
              value && setShift(value)
            }
            sx={{ bgcolor: "rgba(255,255,255,0.12)" }}
          >
            <ToggleButton value="morning">Morning check-in</ToggleButton>
            <ToggleButton value="evening">Evening check-out</ToggleButton>
          </ToggleButtonGroup>
        </CardContent>
      </Card>

      <Alert severity="info" sx={{ mb: 2 }}>
        Mock preview · changes stay in this browser and are not submitted to the
        API.
      </Alert>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        {[
          { value: "24", label: "Workers" },
          { value: "3", label: "Work areas" },
          { value: "2", label: "Requests" },
        ].map((item) => (
          <Card key={item.label} sx={{ flex: 1 }}>
            <CardContent>
              <Typography variant="h4">{item.value}</Typography>
              <Typography variant="body2" color="text.secondary">
                {item.label}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 1.5 }}>
            {shift === "morning" ? "Planned work" : "Today’s work"}
          </Typography>
          <Stack spacing={1.5}>
            {mockActivities.map((activity) => (
              <Stack
                key={activity.title}
                direction="row"
                spacing={1}
                alignItems="center"
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Typography fontWeight={600}>{activity.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {activity.facility} · {activity.workers} workers
                  </Typography>
                </Box>
                <Chip size="small" label={activity.status} />
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label={shift === "morning" ? "Plan notes" : "Shift notes"}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </CardContent>
      </Card>

      <Button
        variant="contained"
        fullWidth
        size="large"
        onClick={() => setSaved(true)}
      >
        Save mock report
      </Button>
      <Snackbar
        open={saved}
        autoHideDuration={2500}
        onClose={() => setSaved(false)}
      >
        <Alert severity="success" variant="filled">
          Mock report saved in this preview.
        </Alert>
      </Snackbar>
    </Box>
  );
}
