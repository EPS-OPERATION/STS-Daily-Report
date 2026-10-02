import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

const fmt = (d: dayjs.Dayjs) => d.format("YYYY-MM-DD");

// From–to calendar range with quick buttons (Today / This week / This month).
// Weeks run Monday–Sunday. Values are ISO dates (YYYY-MM-DD).
export function DateRangeFields({
  from,
  to,
  onChange,
  maxDays,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  /** optional cap on span; the picker clamps "to" to from + maxDays - 1 */
  maxDays?: number;
}) {
  const today = dayjs();
  const monday = today.subtract((today.day() + 6) % 7, "day");
  const set = (f: dayjs.Dayjs, t: dayjs.Dayjs) => {
    let end = t.isBefore(f) ? f : t;
    if (maxDays && end.diff(f, "day") + 1 > maxDays) end = f.add(maxDays - 1, "day");
    onChange(fmt(f), fmt(end));
  };
  return (
    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
      <DatePicker
        label="From"
        value={dayjs(from)}
        onChange={(v) => v?.isValid() && set(v, dayjs(to))}
        format="D MMM YYYY"
        slotProps={{ textField: { size: "small", sx: { width: 160 } } }}
      />
      <DatePicker
        label="To"
        value={dayjs(to)}
        minDate={dayjs(from)}
        maxDate={maxDays ? dayjs(from).add(maxDays - 1, "day") : undefined}
        onChange={(v) => v?.isValid() && set(dayjs(from), v)}
        format="D MMM YYYY"
        slotProps={{ textField: { size: "small", sx: { width: 160 } } }}
      />
      <Button size="small" variant="outlined" onClick={() => set(today, today)}>
        Today
      </Button>
      <Button size="small" variant="outlined" onClick={() => set(monday, monday.add(6, "day"))}>
        This week
      </Button>
      <Button size="small" variant="outlined" onClick={() => set(today.startOf("month"), today.endOf("month"))}>
        This month
      </Button>
    </Stack>
  );
}
