import { http } from "@/services/http/client.js";
import type { FindingInput, SafetyFinding, SafetyStats } from "../types/safety.types.js";

export const safetyKeys = {
  all: ["safety"] as const,
  findings: (projectId: string, from: string, to: string) => [...safetyKeys.all, "findings", projectId, from, to] as const,
  stats: (projectId: string, from: string, to: string) => [...safetyKeys.all, "stats", projectId, from, to] as const,
};

const base = (projectId: string) => `/projects/${projectId}/safety`;

export const safetyApi = {
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
