export interface TextLayout { lines: string[]; width: number; height: number; lineHeight: number }

export let measureContext: CanvasRenderingContext2D | null = null;

// ---- text marker sizing ------------------------------------------------------
// Long titles auto-size the pill and wrap like a Canva text box: up to 3 lines,
// then a trailing ellipsis. Thai strings have no word breaks, so over-long
// tokens are hard-split by character width. The same helper also lays out the
// caption attached under an icon marker (smaller font, max 2 lines).
export const TEXT_FONT = "700 13px Inter, sans-serif";

export const TEXT_MAX_WIDTH = 240;

export const TEXT_LINE_HEIGHT = 17;

export const TEXT_MAX_LINES = 3;

export const CAPTION_FONT = "600 12px Inter, sans-serif";

export const CAPTION_MAX_WIDTH = 200;

export const CAPTION_LINE_HEIGHT = 15;

export const CAPTION_MAX_LINES = 2;

// Note under the title: smaller, muted, two lines max (the full note is in the side panel).
export const NOTE_FONT = "400 11px Inter, sans-serif";

export const NOTE_LINE_HEIGHT = 14;

export function measureText(text: string, font: string) {
  measureContext ??= document.createElement("canvas").getContext("2d");
  if (!measureContext) return text.length * 7;
  measureContext.font = font;
  return measureContext.measureText(text).width;
}

export function layoutTextTitle(title: string, options: { font?: string; maxWidth?: number; lineHeight?: number; maxLines?: number; minWidth?: number } = {}): TextLayout {
  const font = options.font ?? TEXT_FONT;
  const maxWidth = options.maxWidth ?? TEXT_MAX_WIDTH;
  const lineHeight = options.lineHeight ?? TEXT_LINE_HEIGHT;
  const maxLines = options.maxLines ?? TEXT_MAX_LINES;
  const minWidth = options.minWidth ?? 88;
  const source = title.trim() || "ข้อความ";
  const lines: string[] = [];
  for (const token of source.split(/\s+/)) {
    let rest = token;
    while (measureText(rest, font) > maxWidth) {
      let cut = rest.length;
      while (cut > 1 && measureText(rest.slice(0, cut), font) > maxWidth) cut--;
      const head = rest.slice(0, cut);
      const prev = lines[lines.length - 1];
      if (prev && measureText(`${prev} ${head}`, font) <= maxWidth) lines[lines.length - 1] = `${prev} ${head}`;
      else lines.push(head);
      rest = rest.slice(cut);
    }
    if (!rest) continue;
    const prev = lines[lines.length - 1];
    if (prev && measureText(`${prev} ${rest}`, font) <= maxWidth) lines[lines.length - 1] = `${prev} ${rest}`;
    else lines.push(rest);
  }
  if (!lines.length) lines.push(source);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1]!;
    while (last.length > 1 && measureText(`${last}…`, font) > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  const inner = Math.max(...lines.map((line) => measureText(line, font)));
  const width = Math.max(minWidth, Math.min(maxWidth + 24, inner + 24));
  const height = lines.length * lineHeight + 14;
  return { lines, width, height, lineHeight };
}
