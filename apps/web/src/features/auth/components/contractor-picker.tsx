import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { authApi } from "../api/auth.api.js";
import { authKeys } from "../api/auth.keys.js";

export function ContractorPicker({ value, onChange, allowOther = true, selectedName, error, disabled, projectId, label = "Contractor" }: {
  value: string; onChange: (id: string) => void; allowOther?: boolean; selectedName?: string; error?: string; disabled?: boolean; projectId?: string;
  /** Field label; the sign-up form says "Company". */
  label?: string;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(search), 250); return () => window.clearTimeout(timer); }, [search]);
  const query = useQuery({ queryKey: authKeys.contractors(debounced, projectId), queryFn: () => authApi.contractors(debounced, projectId), staleTime: 60_000 });
  const other = { id: "other", code: "", name: "อื่นๆ (Other)" };
  const options = [...(query.data?.data ?? []), ...(allowOther ? [other] : [])];
  const chosen = options.find((o) => o.id === value) ?? (value ? { id: value, code: "", name: selectedName ?? "Selected contractor" } : null);
  return (
    <Stack spacing={1}>
      {query.isError && <Alert severity="error">Unable to load contractors. You can retry by searching again.</Alert>}
      <Autocomplete options={options} value={chosen} loading={query.isFetching} disabled={disabled}
        filterOptions={(items) => items} isOptionEqualToValue={(a, b) => a.id === b.id}
        getOptionLabel={(o) => o.code ? `${o.code} · ${o.name}` : o.name}
        onInputChange={(_, input, reason) => { if (reason === "input" || reason === "clear") setSearch(input); }}
        onChange={(_, option) => onChange(option?.id ?? "")}
        renderInput={(params) => <TextField {...params} label={label} error={Boolean(error)} helperText={error ?? (query.data && query.data.meta.total > 100 ? `Search to find your ${label.toLowerCase()}` : undefined)} />} />
    </Stack>
  );
}
