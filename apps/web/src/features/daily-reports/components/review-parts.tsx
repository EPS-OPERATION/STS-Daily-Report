import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import type { CrewView } from "../utils/review-view.js";
import { crewTotal } from "../utils/review-view.js";

/** A numbered block of the form, as on the form itself (the number matches the contractor's section number). */
export function ReviewSection({ index, title, subtitle, action, children }: { index: number; title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card variant="outlined">
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: "divider", bgcolor: "grey.50" }}>
        <Box sx={{ width: 24, height: 24, borderRadius: "50%", bgcolor: "primary.main", color: "primary.contrastText", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          {index}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{title}</Typography>
          {subtitle ? <Typography variant="caption" color="text.secondary">{subtitle}</Typography> : null}
        </Box>
        {action}
      </Stack>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Card>
  );
}

/** Small heading inside a section (several kinds of data in one block). */
export function SubHeading({ children }: { children: ReactNode }) {
  return <Typography variant="caption" sx={{ display: "block", fontWeight: 700, color: "text.secondary", mb: 0.75 }}>{children}</Typography>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box sx={{ minWidth: 120 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{children}</Typography>
    </Box>
  );
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ columnGap: 4, rowGap: 1.5 }}>{children}</Stack>;
}

/** "Nothing here" line for a block the contractor left empty. */
export function Nothing({ children }: { children: ReactNode }) {
  return <Typography variant="body2" color="text.secondary">{children}</Typography>;
}

/** One banner instead of a screen of empty blocks when a whole shift was not sent. */
export function NotSent({ shift }: { shift: "morning" | "evening" }) {
  return (
    <Alert severity="info">
      {shift === "morning"
        ? "ผู้รับเหมายังไม่ได้ส่งรายงานเช้า (Daily Report) ของวันนี้"
        : "ผู้รับเหมายังไม่ได้ส่งรายงานบ่าย (Daily Request) ของวันนี้"}
    </Alert>
  );
}

/** Positions + nationality/sex of one crew, as the form's crew block shows them. */
export function CrewBlock({ crew, positionLabel }: { crew: CrewView; positionLabel: (code: string) => string }) {
  const thai = crew.thaiMale + crew.thaiFemale, foreign = crew.foreignMale + crew.foreignFemale;
  return (
    <Stack spacing={1.5}>
      <Box>
        <SubHeading>ตามตำแหน่ง · รวม {crewTotal(crew)} คน</SubHeading>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {crew.positions.length === 0
            ? <Nothing>ไม่ได้ระบุตำแหน่ง</Nothing>
            : crew.positions.map((p) => <Chip key={p.position} variant="outlined" label={`${positionLabel(p.position)}: ${p.headcount} คน`} sx={{ fontWeight: 500 }} />)}
        </Stack>
      </Box>
      <Box>
        <SubHeading>สัญชาติและเพศ</SubHeading>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Box sx={{ flex: 1, px: 1.5, py: 1, bgcolor: "grey.50", borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>ไทย {thai} คน</Typography>
            <Typography variant="caption" color="text.secondary">ชาย {crew.thaiMale} · หญิง {crew.thaiFemale}</Typography>
          </Box>
          <Box sx={{ flex: 1, px: 1.5, py: 1, bgcolor: "grey.50", borderRadius: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>ต่างด้าว {foreign} คน</Typography>
            <Typography variant="caption" color="text.secondary">ชาย {crew.foreignMale} · หญิง {crew.foreignFemale}</Typography>
          </Box>
        </Stack>
      </Box>
    </Stack>
  );
}
