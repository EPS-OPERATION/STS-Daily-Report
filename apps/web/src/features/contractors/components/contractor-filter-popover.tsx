import { useMemo } from "react";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import Box from "@mui/material/Box";
import { MultiSelectFilter, type FilterOption } from "@/components/ui/filter-popover.js";

export interface ContractorFilterItem {
  code: string;
  name?: string;
  manDays?: number;
  /** Shown on the right instead of man-days (e.g. "12 รายการ"). */
  countLabel?: string;
  color: string;
}

interface ContractorFilterPopoverProps {
  items: ContractorFilterItem[];
  selectedCodes: Set<string>;
  onChange: (next: Set<string>) => void;
}

export function ContractorFilterPopover({
  items,
  selectedCodes,
  onChange,
}: ContractorFilterPopoverProps) {
  const allCodes = useMemo(() => items.map((i) => i.code), [items]);
  const isFiltered = selectedCodes.size > 0 && selectedCodes.size < allCodes.length;
  const isAllSelected = selectedCodes.size === allCodes.length;
  const isNoneSelected = selectedCodes.size === 0;

  const options: FilterOption[] = useMemo(
    () =>
      items.map((item) => ({
        value: item.code,
        label: item.code,
        sublabel: item.name && item.name !== item.code ? item.name : undefined,
        leading: <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: item.color, flexShrink: 0 }} />,
        count: item.manDays !== undefined ? `${item.manDays.toLocaleString()} คน-วัน` : item.countLabel,
      })),
    [items],
  );

  const buttonLabel = isAllSelected
    ? `ผู้รับเหมา: ทั้งหมด (${allCodes.length})`
    : isNoneSelected
      ? "ผู้รับเหมา: ไม่ได้เลือก"
      : `ผู้รับเหมา: ${selectedCodes.size}/${allCodes.length} เจ้า`;

  return (
    <MultiSelectFilter
      icon={<FilterAltOutlinedIcon fontSize="small" />}
      buttonLabel={buttonLabel}
      filteredCount={isFiltered ? selectedCodes.size : undefined}
      options={options}
      selected={selectedCodes}
      onChange={onChange}
      searchable
      searchPlaceholder="ค้นหาผู้รับเหมา..."
      emptyText="ไม่พบผู้รับเหมา"
      doneLabel="ตกลง"
      align="right"
    />
  );
}
