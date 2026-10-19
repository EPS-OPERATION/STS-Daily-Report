import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { CoordinationContractor } from "@sts/shared";
import { useState } from "react";
import { FormDialog } from "@/components/ui/form-dialog.js";

// EPS can place work for any contractor: ask which one before the item is created, so nothing is
// silently filed under the first company in the list. Contractors (one company) never see this.
export function CompanyPickDialog({
  companies,
  initialId,
  road,
  onPick,
  onClose,
}: {
  companies: CoordinationContractor[];
  initialId?: string | null;
  road: boolean;
  onPick: (contractorId: string) => void;
  onClose: () => void;
}) {
  const [chosen, setChosen] = useState<CoordinationContractor | null>(companies.find((c) => c.id === initialId) ?? null);
  return (
    <FormDialog
      title={road ? "ใช้ถนน — ผู้รับเหมาคนไหน" : "เพิ่มรายการ — ผู้รับเหมาคนไหน"}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        if (chosen) onPick(chosen.id);
      }}
      actions={
        <>
          <Button color="inherit" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" disabled={!chosen}>
            {road ? "เริ่มวาดเส้นทาง" : "เพิ่มรายการ"}
          </Button>
        </>
      }
    >
      <Stack spacing={1.5} sx={{ pt: 1 }}>
        <Autocomplete
          options={companies}
          value={chosen}
          onChange={(_, v) => setChosen(v)}
          getOptionLabel={(c) => `${c.code} · ${c.name}`}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          autoHighlight
          openOnFocus
          renderOption={(props, c) => {
            const { key, ...rest } = props as typeof props & { key: string };
            return (
              <Box component="li" key={key} {...rest} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: "3px", bgcolor: c.color, flexShrink: 0 }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {c.code}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {c.name}
                </Typography>
              </Box>
            );
          }}
          renderInput={(params) => <TextField {...params} label="ผู้รับเหมา" placeholder="พิมพ์รหัสหรือชื่อบริษัท" autoFocus />}
        />
        <Typography variant="body2" color="text.secondary">
          เปลี่ยนภายหลังได้ในแผงแก้ไข (ช่อง Contractor)
        </Typography>
      </Stack>
    </FormDialog>
  );
}
