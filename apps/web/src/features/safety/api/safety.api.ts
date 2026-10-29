import { http } from "@/services/http/client.js";
import type { FindingInput, SafetyFinding, SafetyStats } from "../types/safety.types.js";
import type { RainLogEntry, RainLogInput } from "../types/rain-log.types.js";

export const safetyKeys = {
  all: ["safety"] as const,
  findings: (projectId: string, from: string, to: string) => [...safetyKeys.all, "findings", projectId, from, to] as const,
  stats: (projectId: string, from: string, to: string) => [...safetyKeys.all, "stats", projectId, from, to] as const,
  rainLogs: (projectId: string) => [...safetyKeys.all, "rain-logs", projectId] as const,
};

const base = (projectId: string) => `/projects/${projectId}/safety`;

export const safetyApi = {
  renumberWeek(projectId: string, date: string): Promise<{ data: { weekStart: string; count: number } }> {
    return http.post(`${base(projectId)}/findings/renumber-week`, { date });
  },
  rainLogs(projectId: string, from: string, to: string): Promise<{ data: RainLogEntry[] }> {
    return http.get(`${base(projectId)}/rain-logs?from=${from}&to=${to}`);
  },
  createRainLog(projectId: string, input: RainLogInput): Promise<{ data: { id: string } }> {
    return http.post(`${base(projectId)}/rain-logs`, toBody(input));
  },
  updateRainLog(projectId: string, id: string, input: RainLogInput): Promise<{ data: { id: string } }> {
    return http.put(`${base(projectId)}/rain-logs/${id}`, toBody(input));
  },
  removeRainLog(projectId: string, id: string): Promise<null> {
    return http.delete(`${base(projectId)}/rain-logs/${id}`);
  },
  findings(projectId: string, from: string, to: string): Promise<{ data: SafetyFinding[] }> {
    return http.get(`${base(projectId)}/findings?from=${from}&to=${to}`);
  },
  stats(projectId: string, from: string, to: string): Promise<{ data: SafetyStats }> {
    return http.get(`${base(projectId)}/stats?from=${from}&to=${to}`);
  },
  create(projectId: string, input: FindingInput): Promise<{ data: { id: string } }> {
    return http.post(`${base(projectId)}/findings`, input);
  },
  update(projectId: string, id: string, input: FindingInput): Promise<{ data: { id: string } }> {
    return http.put(`${base(projectId)}/findings/${id}`, input);
  },
  remove(projectId: string, id: string): Promise<null> {
    return http.delete(`${base(projectId)}/findings/${id}`);
  },
  uploadPhoto(projectId: string, id: string, kind: "finding" | "close", file: File): Promise<{ data: { id: string } }> {
    const form = new FormData();
    form.set("file", file);
    return http.upload(`${base(projectId)}/findings/${id}/photos/${kind}`, form);
  },
};

// Only the fields the API stores (projectId and recordedBy come from the URL and the session).
function toBody(i: RainLogInput) {
  return {
    date: i.date,
    startTime: i.startTime,
    endTime: i.endTime,
    stoppageHours: i.stoppageHours,
    intensity: i.intensity ?? null,
    rainfallMm: i.rainfallMm ?? null,
    impactSummary: i.impactSummary,
    delayClaimNote: i.delayClaimNote || null,
  };
}
