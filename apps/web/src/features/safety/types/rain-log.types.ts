export type RainIntensity = "light" | "moderate" | "heavy" | "storm";

export interface RainLogEntry {
  id: string;
  projectId: string;
  date: string; // ISO date YYYY-MM-DD
  startTime: string; // HH:mm e.g. "13:30"
  endTime: string; // HH:mm e.g. "16:00"
  stoppageHours: number; // e.g. 2.5
  /** Older entries only — the form no longer asks for intensity, rainfall or affected activities. */
  intensity?: RainIntensity;
  rainfallMm?: number | null;
  affectedActivities?: string[];
  impactSummary: string;
  delayClaimNote?: string;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type RainLogInput = Omit<RainLogEntry, "id" | "createdAt" | "updatedAt">;

export interface RainStats {
  totalRainyDays: number;
  totalStoppageHours: number;
  heavyRainEvents: number;
  maxStoppageHoursInDay: number;
  mostAffectedActivity: string | null;
  byDate: {
    date: string;
    label: string;
    stoppageHours: number;
    rainfallMm: number;
    intensity: RainIntensity;
    entries: RainLogEntry[];
  }[];
}
