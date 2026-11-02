import { eq, or } from "drizzle-orm";
import { dailyReports } from "@/db/schema/index.js";

// A day-ahead request counts once its report has been sent (evening = normal path;
// morning = rows created before requests moved to the evening form).
export const reportSent = or(eq(dailyReports.eveningStatus, "submitted"), eq(dailyReports.morningStatus, "submitted"));
