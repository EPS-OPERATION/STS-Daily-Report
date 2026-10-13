import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

const iso = (d: dayjs.Dayjs) => d.format("YYYY-MM-DD");

// Which day's map plan is shown: date picker + Today / Tomorrow (the 17:00 meeting plans tomorrow).
export function MapDayPicker({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  const today = iso(dayjs());
  const tomorrow = iso(dayjs().add(1, "day"));
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <DatePicker
        label="แผนงานวันที่"
        value={dayjs(date)}
        onChange={(v) => v?.isValid() && onChange(iso(v))}
        format="D MMM YYYY"
        slotProps={{ textField: { size: "small", sx: { width: 170 } } }}
      />
      <Button size="small" variant={date === today ? "contained" : "outlined"} onClick={() => onChange(today)}>
        วันนี้
      </Button>
      <Button size="small" variant={date === tomorrow ? "contained" : "outlined"} onClick={() => onChange(tomorrow)}>
        พรุ่งนี้
      </Button>
    </Stack>
  );
}
