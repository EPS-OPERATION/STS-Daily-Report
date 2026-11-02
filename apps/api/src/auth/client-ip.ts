// The caller's address for rate limiting. Behind a trusted proxy (Vercel, Caddy, nginx) the socket peer is the
// proxy itself, so TRUST_PROXY=true reads the first X-Forwarded-For hop instead. Never enable it when the API is
// reachable directly: the header is then client-controlled.
export function clientIp(headers: Headers, peer: string | undefined, trustProxy: boolean): string {
  if (trustProxy) {
    const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim();
    if (forwarded) return forwarded;
  }
  return peer ?? "unknown";
}
