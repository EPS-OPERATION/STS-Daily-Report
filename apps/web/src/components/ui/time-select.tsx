import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";
import type { SxProps, Theme } from "@mui/material/styles";

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Times from `from` to `to` (inclusive) every `step` minutes, "HH:mm". */
export function timeSteps(step = 15, from = "05:00", to = "22:00") {
  const out: string[] = [];
  for (let m = toMin(from); m <= toMin(to); m += step) out.push(fromMin(m));
  return out;
}

/** What people type → "HH:mm": "8" "08" "830" "0830" "8:30" "8.30" "13.15 น." (null when it is not a time). */
export function parseTime(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.replace(/น\.?/g, "").trim();
  const m = s.match(/^(\d{1,2})(?:[:.\s]?(\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] === undefined ? 0 : Number(m[2]);
  if (h > 23 || min > 59) return null;
  return fromMin(h * 60 + min);
}

// "8" or "08" finds 08:xx; "83" or "083" finds 08:30; "1315" finds 13:15.
function matches(option: string, typed: string) {
  const q = typed.replace(/\D/g, "");
  if (!q) return true;
  const digits = option.replace(":", "");
  return digits.startsWith(q) || digits.startsWith(`0${q}`);
}

// The app's one time input: a 24-hour list ("08:00 น.") you can also type into to search — "830"
// jumps to 08:30, Enter picks it, and any valid typed time (e.g. 08:10) is accepted. No AM/PM and no
// phone clock wheel. `after` (the start time) keeps an end field later than the start.
export function TimeSelect({
  label,
  value,
  onChange,
  onBlur,
  after,
  step = 15,
  from = "05:00",
  to = "22:00",
  error,
  helperText,
  fullWidth = true,
  disabled,
  sx,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Exclusive lower bound, e.g. the start time for an end field. */
  after?: string;
  step?: number;
  from?: string;
  to?: string;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  disabled?: boolean;
  sx?: SxProps<Theme>;
}) {
  const later = (t: string) => !after || !TIME.test(after) || toMin(t) > toMin(after);
  const steps = timeSteps(step, from, to).filter(later);
  // A value off the step grid (older data, or typed) stays in the list so editing never changes it silently.
  const options = value && TIME.test(value) && !steps.includes(value) ? [...steps, value].sort() : steps;

  const shown = TIME.test(value ?? "") ? value : "";
  // The text in the box: what is being typed, snapped back to the chosen time after every pick or blur.
  const [text, setText] = useState(shown);
  useEffect(() => setText(shown), [shown]);

  const pick = (raw: string | null) => {
    // A full time ("1610", "8.30") is taken as typed; otherwise the first listed time it matches ("73" → 07:30).
    const exact = parseTime(raw);
    const t = exact && later(exact) ? exact : raw && raw !== shown ? (options.find((o) => matches(o, raw)) ?? null) : null;
    if (t && later(t)) {
      onChange(t);
      setText(t);
    } else {
      setText(shown);
    }
  };

  return (
    <Autocomplete
      freeSolo
      autoHighlight
      autoSelect
      openOnFocus
      selectOnFocus
      handleHomeEndKeys
      disableClearable
      size="small"
      fullWidth={fullWidth}
      disabled={disabled}
      sx={sx}
      options={options}
      value={shown}
      inputValue={text}
      onInputChange={(_, v, reason) => {
        if (reason === "input") setText(v);
      }}
      filterOptions={(opts, state) => {
        // While the box shows the chosen time unchanged, list everything (tap = browse).
        if (state.inputValue === shown) return opts;
        return opts.filter((o) => matches(o, state.inputValue));
      }}
      onChange={(_, v) => pick(typeof v === "string" ? v : null)}
      onBlur={() => {
        if (text !== shown) pick(text);
        onBlur?.();
      }}
      renderOption={(props, option) => {
        const { key, ...rest } = props as typeof props & { key: string };
        return (
          <li key={key} {...rest} style={{ fontVariantNumeric: "tabular-nums" }}>
            {option} น.
          </li>
        );
      }}
      slotProps={{ paper: { sx: { maxHeight: 320 } }, listbox: { sx: { maxHeight: 300 } } }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={error}
          helperText={helperText}
          placeholder="เช่น 0830"
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { ...params.inputProps, inputMode: "numeric", autoComplete: "off" },
          }}
        />
      )}
    />
  );
}
