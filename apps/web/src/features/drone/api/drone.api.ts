import { http } from "@/services/http/client.js";
import type { DronePhotoLog } from "../types/drone.types.js";

interface DroneLogRow {
  id: string;
  projectId: string;
  logDate: string;
  title: string;
  description: string;
  capturedBy: string;
  tags: string[];
  imageUrl: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

const toLog = (r: DroneLogRow): DronePhotoLog => ({
  id: r.id,
  date: r.logDate,
  title: r.title,
  description: r.description,
  imageUrl: r.imageUrl ?? "",
  capturedBy: r.capturedBy || undefined,
  tags: r.tags ?? [],
});

export interface DroneUploadInput {
  date: string;
  title: string;
  description?: string;
  capturedBy?: string;
  tags?: string;
  file: File;
}

export const droneApi = {
  list(projectId: string, from?: string, to?: string): Promise<{ data: DronePhotoLog[] }> {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const qs = q.toString();
    return http
      .get<{ data: DroneLogRow[] }>(`/drone/projects/${projectId}/logs${qs ? `?${qs}` : ""}`)
      .then((res) => ({ data: res.data.map(toLog) }));
  },
  upload(projectId: string, input: DroneUploadInput): Promise<{ data: { id: string } }> {
    const form = new FormData();
    form.set("date", input.date);
    form.set("title", input.title);
    if (input.description) form.set("description", input.description);
    if (input.capturedBy) form.set("capturedBy", input.capturedBy);
    if (input.tags) form.set("tags", input.tags);
    form.set("file", input.file);
    return http.upload(`/drone/projects/${projectId}/logs`, form);
  },
  remove(id: string): Promise<null> {
    return http.delete(`/drone/logs/${id}`);
  },
};
