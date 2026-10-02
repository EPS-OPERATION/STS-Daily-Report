import type { DronePhotoLog } from "../types/drone.types.js";

export const MOCK_DRONE_LOGS: DronePhotoLog[] = [
  {
    id: "log-2026-10-01",
    date: "2026-10-01",
    title: "สำรวจโครงสร้าง Boiler & ถังไซโลเชื้อเพลิง",
    description: "งานติดตั้งเสาโครงสร้างเหล็ก Boiler Tier-2 ขึ้นโครงสร้างแล้วเสร็จ และพื้นที่จัดเก็บเชื้อเพลิงชีวมวลเริ่มขึ้นโครงถัง",
    imageUrl: "/drone/flight-2026-10-01.jpg",
    capturedBy: "EPS QAQC Team",
    tags: ["Boiler", "Silo", "ภาพมุมสูงรวม"],
  },
  {
    id: "log-2026-09-05",
    date: "2026-09-05",
    title: "งานเทคอนกรีตฐานรากและโครงสร้างใต้ดิน",
    description: "เทคอนกรีตฐานรากอาคารหลักและลานกองเชื้อเพลิงเรียบร้อย เตรียมรับโครงสร้างเหล็กประกอบ",
    imageUrl: "/drone/flight-2026-09-05.jpg",
    capturedBy: "EPS QAQC Team",
    tags: ["Foundation", "Civil", "ภาพมุมสูงรวม"],
  },
];
