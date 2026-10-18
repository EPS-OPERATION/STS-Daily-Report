import ArrowForwardIcon from "@mui/icons-material/ArrowForwardOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import { BlockSkeleton } from "@/components/ui/skeletons.js";
import type { UseDashboardState } from "../hooks/use-dashboard.js";
import { HIGHLIGHT_TONE } from "../hooks/use-dashboard.js";

export function TodayHighlights({ ed }: { ed: UseDashboardState }) {
  const { dailyReqs, dynamicHighlights } = ed;
  return (
    <Grid size={{ xs: 12, lg: 6 }}>
      <Card sx={{ height: "100%" }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Box>
              <Typography variant="h5">Today&apos;s Highlight</Typography>
              <Typography variant="caption" color="text.secondary">
                คำขอประจำวัน (ดึงจากฟอร์มรายงานบ่ายของเมื่อวาน)
              </Typography>
            </Box>
            <Link component={RouterLink} to="/today-requests" underline="hover" fontSize={13}>
              View all ({dynamicHighlights.length})
            </Link>
          </Stack>

          {dailyReqs.isLoading ? (
            <Stack spacing={1.5} sx={{ py: 2 }}>
              <BlockSkeleton height={48} />
              <BlockSkeleton height={48} />
              <BlockSkeleton height={48} />
            </Stack>
          ) : dynamicHighlights.length === 0 ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                ยังไม่มีคำขอเครื่องจักร/ใบอนุญาตสำหรับวันนี้
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                (ระบบจะดึงคำขอจากฟอร์มรอบบ่ายที่ผู้รับเหมาส่งเมื่อวานโดยอัตโนมัติ)
              </Typography>
              <Button
                component={RouterLink}
                to="/today-requests"
                variant="outlined"
              >
                เปิดดู Daily Request
              </Button>
            </Box>
          ) : (
            <List disablePadding>
              {dynamicHighlights.slice(0, 5).map((h) => {
                const tone = HIGHLIGHT_TONE[h.tone];
                const ToneIcon = tone.icon;
                return (
                  <ListItem key={h.id} disableGutters sx={{ py: 1.25 }}>
                    <ListItemAvatar sx={{ minWidth: 44 }}>
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          bgcolor: tone.bg,
                          color: tone.fg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ToneIcon fontSize="small" aria-hidden="true" />
                      </Box>
                    </ListItemAvatar>
                    <ListItemText
                      primary={h.title}
                      secondary={h.lines.join(" · ")}
                      primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                      secondaryTypographyProps={{ fontSize: 13 }}
                    />
                  </ListItem>
                );
              })}
            </List>
          )}

          <Button
            component={RouterLink}
            to="/today-requests"
            variant="outlined"
            endIcon={<ArrowForwardIcon />}
            fullWidth
            sx={{ mt: 1 }}
          >
            เปิดดูคำขอประจำวันทั้งหมด (Daily Request)
          </Button>
        </CardContent>
      </Card>
    </Grid>
  );
}
