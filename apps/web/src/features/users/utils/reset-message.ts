import { SUPPORT_CONTACT } from "@/config.js";

// Formal reset-password message (Thai, then English) for the admin to copy or open in their email app.
// The app sends no email itself, so the admin sends this from their own mailbox.
export function resetMessage(user: { email: string; username: string | null }, link: { url: string; expiresAt: string }) {
  const name = user.username ?? user.email;
  const expires = new Date(link.expiresAt);
  const th = expires.toLocaleString("th-TH", { dateStyle: "long", timeStyle: "short" });
  const en = expires.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" });
  const subject = "ตั้งรหัสผ่านใหม่ STS Platform / Reset your STS Platform password";
  const body = [
    `เรียน คุณ${name}`,
    "",
    `ผู้ดูแลระบบ STS Platform ได้สร้างลิงก์สำหรับตั้งรหัสผ่านใหม่ให้บัญชีของท่าน (${user.email})`,
    `กรุณากดลิงก์ด้านล่างเพื่อตั้งรหัสผ่านใหม่ ลิงก์นี้ใช้ได้ครั้งเดียว และหมดอายุ ${th}`,
    "",
    link.url,
    "",
    `หากท่านไม่ได้ขอเปลี่ยนรหัสผ่าน หรือมีปัญหาในการใช้งาน โปรดติดต่อทีม EPS QAQC โทร ${SUPPORT_CONTACT.tel} อีเมล ${SUPPORT_CONTACT.email}`,
    "",
    "ขอแสดงความนับถือ",
    "ทีม EPS QAQC",
    "",
    "──────────",
    "",
    `Dear ${name},`,
    "",
    `The STS Platform administrator has created a link to set a new password for your account (${user.email}).`,
    `Please open the link below to choose a new password. It can be used once and expires on ${en}.`,
    "",
    link.url,
    "",
    `If you did not ask for a password reset, or need help, please contact the EPS QAQC team: ${SUPPORT_CONTACT.tel} · ${SUPPORT_CONTACT.email}`,
    "",
    "Best regards,",
    "EPS QAQC Team",
  ].join("\n");
  const mailto = `mailto:${encodeURIComponent(user.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return { subject, body, mailto };
}
