import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { compressImage } from "@/features/daily-reports/index.js";
import { safetyApi, safetyKeys } from "../api/safety.api.js";
import type { FindingInput, SafetyStatInput, SafetyBaselineInput } from "../types/safety.types.js";

export function useSafetyFindings(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: safetyKeys.findings(projectId ?? "", from, to),
    queryFn: () => safetyApi.findings(projectId!, from, to),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

export function useSafetyStats(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: safetyKeys.stats(projectId ?? "", from, to),
    queryFn: () => safetyApi.stats(projectId!, from, to),
    enabled: Boolean(projectId),
    placeholderData: keepPreviousData,
  });
}

export function useSafetyStatEntries(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: safetyKeys.statEntries(projectId ?? "", from, to),
    queryFn: () => safetyApi.statEntries(projectId!, from, to),
    enabled: Boolean(projectId),
  });
}

export function useSaveSafetyStat(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SafetyStatInput) => safetyApi.saveStatEntry(projectId!, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: safetyKeys.all }),
  });
}

// The record of the project's history before the app, with the hours the app has counted up to `asOf`.
export function useSafetyBaseline(projectId: string | null, asOf: string, enabled = true) {
  return useQuery({
    queryKey: safetyKeys.baseline(projectId ?? "", asOf),
    queryFn: () => safetyApi.baseline(projectId!, asOf),
    enabled: Boolean(projectId) && enabled,
  });
}

export function useSafetyBaselineVersions(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: safetyKeys.baselineVersions(projectId ?? ""),
    queryFn: () => safetyApi.baselineVersions(projectId!),
    enabled: Boolean(projectId) && enabled,
  });
}

// Safety history before the app (start date, total hours, last LTI): refreshes every stats view.
export function useSaveSafetyBaseline(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SafetyBaselineInput) => safetyApi.saveBaseline(projectId!, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: safetyKeys.all }),
  });
}

// Edit history of one stat entry (only meaningful once an entry exists).
export function useSafetyStatVersions(projectId: string | null, entryId: string | null) {
  return useQuery({
    queryKey: safetyKeys.statEntryVersions(projectId ?? "", entryId ?? ""),
    queryFn: () => safetyApi.statEntryVersions(projectId!, entryId!),
    enabled: Boolean(projectId && entryId),
  });
}

export function useDeleteSafetyStat(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => safetyApi.deleteStatEntry(projectId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: safetyKeys.all }),
  });
}

// Save = create/update the row, then upload any newly picked photos.
export function useSaveFinding(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { id: string | null; input: FindingInput; findingPhoto?: File | null; closePhoto?: File | null }) => {
      const pid = projectId!;
      const id = v.id ?? (await safetyApi.create(pid, v.input)).data.id;
      if (v.id) await safetyApi.update(pid, v.id, v.input);
      if (v.findingPhoto) {
        const compressedFinding = await compressImage(v.findingPhoto, { maxDimension: 1600, quality: 0.8 });
        await safetyApi.uploadPhoto(pid, id, "finding", compressedFinding);
      }
      if (v.closePhoto) {
        const compressedClose = await compressImage(v.closePhoto, { maxDimension: 1600, quality: 0.8 });
        await safetyApi.uploadPhoto(pid, id, "close", compressedClose);
      }
      return id;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: safetyKeys.all }),
  });
}

// Close the gaps of one ISO week (1..N by inspection date). `date` = any day of that week.
export function useRenumberWeek(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date: string) => safetyApi.renumberWeek(projectId!, date),
    onSuccess: () => qc.invalidateQueries({ queryKey: safetyKeys.all }),
  });
}

export function useDeleteFinding(projectId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => safetyApi.remove(projectId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: safetyKeys.all }),
  });
}
