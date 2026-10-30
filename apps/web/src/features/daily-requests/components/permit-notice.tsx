import WarningAmberOutlined from "@mui/icons-material/WarningAmberOutlined";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import { PhotoViewer } from "@/components/ui/photo-viewer.js";
import { ContractorBadge } from "@/features/contractors/index.js";
import type { PermitNotice } from "../types/daily-request.types.js";
import { getPermitIconComponent, permitLabel } from "./permit-meta.js";

function PermitIcon({ type }: { type: string }) {
  const Icon = getPermitIconComponent(type);
  return <Icon sx={{ color: "text.secondary" }} aria-hidden="true" />;
}

type Photo = PermitNotice["photos"][number];

/** Small pictures of the work location; tap = full size. Pictures whose link could not be made are left out. */
export function PermitNoticeThumbs({ photos, size = 64 }: { photos: Photo[]; size?: number }) {
  const [viewing, setViewing] = useState<Photo | null>(null);
  const shown = photos.filter((p) => p.url);
  if (!shown.length) return null;
  return (
    <>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {shown.map((p) => (
          <Box key={p.id} component="button" type="button" aria-label={`ดูรูปตำแหน่งงาน ${p.fileName}`} onClick={() => setViewing(p)}
            sx={{ p: 0, width: size, height: size, borderRadius: 1, overflow: "hidden", border: 1, borderColor: "divider", bgcolor: "grey.100", cursor: "zoom-in", flexShrink: 0 }}>
            <Box component="img" src={p.url!} alt={p.fileName} loading="lazy" sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </Box>
        ))}
      </Stack>
      <PhotoViewer src={viewing?.url ?? null} alt={viewing?.fileName} onClose={() => setViewing(null)} />
    </>
  );
}

/** One work permit of the day: where, what, who. With location photos it is a warning (extra openings: everyone
 *  working nearby must take extra care); without, a plain line. */
export function PermitNoticeCard({ notice }: { notice: PermitNotice }) {
  const place = notice.buildingNameTh || notice.buildingName;
  const kind = notice.permitType === "other" && notice.otherLabel ? notice.otherLabel : permitLabel(notice.permitType);
  if (!notice.photos.length) {
    return (
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ px: 1.5, py: 1, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}>
        <PermitIcon type={notice.permitType} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>{notice.taskName || kind}</Typography>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
            <ContractorBadge code={notice.contractorCode} title={notice.contractorName} />
            <Typography variant="caption" color="text.secondary">{notice.buildingCode} {place} · {kind}</Typography>
          </Stack>
        </Box>
      </Stack>
    );
  }
  return (
    <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: (t) => alpha(t.palette.warning.light, 0.5), border: "1px solid", borderColor: (t) => alpha(t.palette.warning.main, 0.4) }}>
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <WarningAmberOutlined sx={{ color: "warning.dark", mt: 0.25 }} aria-hidden="true" />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>{notice.taskName || kind}</Typography>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.25 }}>
            <ContractorBadge code={notice.contractorCode} title={notice.contractorName} />
            <Typography variant="caption" color="text.secondary">{notice.buildingCode} {place} · {kind}</Typography>
          </Stack>
          <Typography variant="body2" sx={{ mt: 0.75 }}>
            มีช่องเปิด/จุดเสี่ยงเพิ่มในพื้นที่ทำงาน ผู้ที่ทำงานบริเวณใกล้เคียงโปรดระวังเป็นพิเศษ
          </Typography>
          <Box sx={{ mt: 1 }}>
            <PermitNoticeThumbs photos={notice.photos} size={72} />
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
