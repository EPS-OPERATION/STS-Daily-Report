import TouchAppOutlinedIcon from "@mui/icons-material/TouchAppOutlined";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { keyframes } from "@mui/material/styles";
import { DISCIPLINES, type Discipline } from "@sts/shared";

// Soft glow around the buttons while nothing is chosen (still for people who prefer reduced motion).
const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(11, 77, 139, 0.35); }
  50% { box-shadow: 0 0 0 6px rgba(11, 77, 139, 0); }
`;

// CE / ME / EE choice. With nothing chosen (`attention`) the row itself asks for a tap — a soft pulse
// and a "เริ่มที่นี่" tag — instead of a separate notice elsewhere on the page.
export function DisciplineChips({ value, onChange, attention }: { value: Discipline[]; onChange: (next: Discipline[]) => void; attention: boolean }) {
  return (
    <Box>
      {attention ? (
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.75, color: "primary.main" }}>
          <TouchAppOutlinedIcon sx={{ fontSize: 18 }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: "inherit" }}>
            เริ่มที่นี่ — เลือกประเภทงานวันนี้
          </Typography>
        </Stack>
      ) : null}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {DISCIPLINES.map((d) => {
          const on = value.includes(d.code);
          return (
            <Chip
              key={d.code}
              label={d.label}
              color={on || attention ? "primary" : "default"}
              variant={on ? "filled" : "outlined"}
              onClick={() => onChange(on ? value.filter((x) => x !== d.code) : [...value, d.code])}
              sx={{
                minHeight: 36,
                ...(attention
                  ? { borderWidth: 2, fontWeight: 700, animation: `${pulse} 1.8s ease-in-out infinite`, "@media (prefers-reduced-motion: reduce)": { animation: "none" } }
                  : {}),
              }}
            />
          );
        })}
      </Stack>
    </Box>
  );
}
