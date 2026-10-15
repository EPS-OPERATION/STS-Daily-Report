// Form sections in screen order, each with the form keys it holds. Used to send the user to the
// first section that still has a problem when they press submit.
export type SectionMap = readonly (readonly [id: string, keys: readonly string[]])[];

export function firstSection(errorKeys: readonly string[], map: SectionMap): string | null {
  return map.find(([, keys]) => keys.some((k) => errorKeys.includes(k)))?.[0] ?? null;
}

// The heading the user sees, so the message names the place to fix.
export function sectionTitle(id: string): string {
  return document.getElementById(id)?.querySelector("h5")?.textContent ?? "";
}

// Scrolls the section into view, then puts the cursor in its first field marked invalid.
export function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => {
    el.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus({ preventScroll: true });
  }, 450);
}
