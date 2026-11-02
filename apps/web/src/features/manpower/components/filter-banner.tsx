import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { UseManpowerPageState } from "../hooks/use-manpower-page.js";

export function FilterBanner({ ed }: { ed: UseManpowerPageState }) {
  const { contractorNameMap, allCodes, colors, selectedCodes, removeContractor, selectAllContractors } = ed;
  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 2,
        p: 1.25,
        px: 2,
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 1.5,
        bgcolor: "action.hover",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <FilterAltOutlinedIcon fontSize="small" color="primary" />
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          กรองเฉพาะผู้รับเหมา ({selectedCodes.size}/{allCodes.length} เจ้า):
        </Typography>
        {Array.from(selectedCodes).map((code) => (
          <Chip
            key={code}
            size="small"
            label={contractorNameMap.get(code) ? `${code} (${contractorNameMap.get(code)})` : code}
            onDelete={() => removeContractor(code)}
            sx={{
              bgcolor: colors.get(code),
              color: "common.white",
              fontWeight: 700,
              "& .MuiChip-deleteIcon": { color: "rgba(255,255,255,0.8)", "&:hover": { color: "common.white" } },
            }}
          />
        ))}
      </Stack>
      <Button variant="text" onClick={selectAllContractors} sx={{ fontWeight: 600 }}>
        แสดงทั้งหมด ({allCodes.length})
      </Button>
    </Paper>
  );
}
