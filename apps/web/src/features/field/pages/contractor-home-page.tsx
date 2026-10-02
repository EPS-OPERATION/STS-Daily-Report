import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import Grid from "@mui/material/Grid";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import IconButton from "@mui/material/IconButton";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { FieldBottomNav } from "@/features/field/components/field-bottom-nav.js";

// Mobile-first field home. Answers: "what do I need to do right now?"
// Centered narrow column on desktop, full-bleed on mobile.
export function ContractorHomePage() {
  const photoInput = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  return (
    <Box sx={{ maxWidth: { xs: 480, md: 960 }, mx: "auto" }}>
      {/* Navy header */}
      <Card sx={{ bgcolor: "navy.dark", border: "none", mb: 2 }}>
        <CardContent sx={{ p: 2.5, color: "#FFFFFF" }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
            <Box>
              <Typography variant="caption" sx={{ color: "#9DB4CC" }}>
                9:41
              </Typography>
              <Typography variant="h4" sx={{ color: "#FFFFFF" }}>
                Good morning
              </Typography>
              <Typography variant="h5" sx={{ color: "#FFFFFF" }}>
                STS Project
              </Typography>
              <Typography variant="caption" sx={{ color: "#9DB4CC" }}>
                28 Sep 2026
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton aria-label="Notifications" sx={{ color: "#FFFFFF" }}>
                <NotificationsNoneOutlinedIcon />
              </IconButton>
              <Avatar sx={{ width: 36, height: 36, bgcolor: "info.main" }}>S</Avatar>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Today's tasks */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="h5">Today&apos;s Tasks</Typography>
            <Button component={RouterLink} to="/daily-reports" variant="text" size="small">
              View all
            </Button>
          </Stack>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <CheckCircleOutlineIcon color="success" />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Morning Report
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Submitted 07:42
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ScheduleOutlinedIcon color="warning" />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Evening Report
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Not submitted
                </Typography>
              </Box>
              <Button component={RouterLink} to="/evening-report" size="small">
                Submit
              </Button>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <DescriptionOutlinedIcon color="info" />
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Tomorrow Plan
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  3 activities
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <FactCheckOutlinedIcon color="error" />
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  QAQC
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  1 inspection tomorrow
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Button component={RouterLink} to="/evening-report" size="large" fullWidth sx={{ minHeight: 48, mb: 2 }}>
        Complete Evening Report
      </Button>

      {/* Quick actions */}
      <Typography variant="h5" sx={{ mb: 1.5 }}>
        Quick Actions
      </Typography>
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {[
          { label: "Evening Report", icon: <DescriptionOutlinedIcon />, to: "/evening-report" },
          { label: "View Plan", icon: <MapOutlinedIcon />, to: "/tomorrow" },
        ].map((a) => (
          <Grid key={a.label} size={{ xs: 6, md: 3 }}>
            <Card
              component={RouterLink}
              to={a.to}
              sx={{ textDecoration: "none", display: "block", textAlign: "center", p: 2 }}
            >
              <Box sx={{ color: "info.main", mb: 0.5 }}>{a.icon}</Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {a.label}
              </Typography>
            </Card>
          </Grid>
        ))}
        <Grid size={{ xs: 6, md: 3 }}>
          <Card onClick={() => photoInput.current?.click()} sx={{ textAlign: "center", p: 2, cursor: "pointer" }}>
            <Box sx={{ color: "info.main", mb: 0.5 }}>
              <PhotoCameraOutlinedIcon />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Upload Photo{photos.length > 0 ? ` (${photos.length})` : ""}
            </Typography>
          </Card>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            aria-label="Upload site photos"
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []).map((f) => f.name))}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card
            component={RouterLink}
            to="/work-permits"
            sx={{ textDecoration: "none", display: "block", textAlign: "center", p: 2 }}
          >
            <Box sx={{ color: "success.main", mb: 0.5 }}>
              <AssignmentOutlinedIcon />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Work Permit
            </Typography>
          </Card>
        </Grid>
      </Grid>
      {photos.length > 0 ? (
        <Typography variant="caption" color="text.secondary">
          Selected: {photos.join(", ")}
        </Typography>
      ) : null}

      <FieldBottomNav />
    </Box>
  );
}
