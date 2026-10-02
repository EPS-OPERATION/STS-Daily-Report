import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { contractorApi } from "../api/contractor.api.js";
import { contractorKeys } from "@/consts/query-keys/contractors.js";
import type { ContractorFilters } from "../types/contractor.types.js";

export function useContractors(filters: ContractorFilters) {
  return useQuery({
    queryKey: contractorKeys.list(filters),
    queryFn: () => contractorApi.getAll(filters),
    placeholderData: keepPreviousData,
  });
}
