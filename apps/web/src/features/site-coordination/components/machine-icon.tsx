import { useEffect, useState } from "react";
import { Group, Image as CanvasImage } from "react-konva";
import type { CoordinationIcon } from "@sts/shared";
import boxUrl from "../icons/box.png";
import craneUrl from "../icons/crane.png";
import machineryUrl from "../icons/machinery.png";
import pinUrl from "../icons/pin.png";
import pipeUrl from "../icons/pipe.png";
import truckUrl from "../icons/truck.png";
import weldUrl from "../icons/weld.png";

// "text" markers render as a title pill (see coordination-canvas), never as a glyph.
type MachineIconName = Exclude<CoordinationIcon, "text">;

// PNG artwork is a black silhouette on white; at runtime the silhouette is used as
// an alpha mask and recoloured with the contractor colour, so one image serves all.
export const MACHINE_ICON_URLS: Record<MachineIconName, string> = {
  crane: craneUrl, machinery: machineryUrl, truck: truckUrl, weld: weldUrl, pipe: pipeUrl, box: boxUrl, pin: pinUrl,
};
const sources = new Map<MachineIconName, Promise<HTMLImageElement>>();
function loadSource(icon: MachineIconName) {
  let promise = sources.get(icon);
  if (!promise) {
    promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = MACHINE_ICON_URLS[icon];
    });
    sources.set(icon, promise);
  }
  return promise;
}

const tints = new Map<string, HTMLCanvasElement>();
const tintUrls = new Map<string, string>();

function parseColor(color: string): [number, number, number] {
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0]! + hex[0]!, 16),
        parseInt(hex[1]! + hex[1]!, 16),
        parseInt(hex[2]! + hex[2]!, 16),
      ];
    }
    if (hex.length >= 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
  }
  return [100, 116, 139];
}

function tintIcon(icon: MachineIconName, color: string, source: HTMLImageElement) {
  const key = `${icon}|${color}`;
  const cached = tints.get(key);
  if (cached) return cached;
  // Tint at the artwork's native resolution: the canvas then goes through a single
  // smooth downscale when Konva draws it, which keeps thin details crisp.
  const canvas = document.createElement("canvas");
  canvas.width = source.naturalWidth; canvas.height = source.naturalHeight;
  const context = canvas.getContext("2d")!;
  context.drawImage(source, 0, 0);
  const frame = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = frame.data;
  const [r, g, b] = parseColor(color);
  for (let i = 0; i < data.length; i += 4) {
    // Alpha combines the source alpha (transparent background) with darkness
    // (black silhouette = opaque, white = transparent), then the pixel is
    // painted with the contractor colour.
    const alpha = data[i + 3]! * (255 - Math.round((data[i]! + data[i + 1]! + data[i + 2]!) / 3)) / 255;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = alpha < 12 ? 0 : Math.round(alpha);
  }
  context.putImageData(frame, 0, 0);
  tints.set(key, canvas);
  return canvas;
}

function getTintedUrl(icon: MachineIconName, color: string, source: HTMLImageElement): string {
  const key = `${icon}|${color}`;
  const cached = tintUrls.get(key);
  if (cached) return cached;
  const canvas = tintIcon(icon, color, source);
  const url = canvas.toDataURL();
  tintUrls.set(key, url);
  return url;
}

export function MachineIcon({ icon, color, rotation = 0, size = 38 }: { icon: MachineIconName; color: string; rotation?: number; size?: number }) {
  const [tinted, setTinted] = useState<HTMLCanvasElement | null>(() => tints.get(`${icon}|${color}`) ?? null);
  useEffect(() => {
    const key = `${icon}|${color}`;
    const cached = tints.get(key);
    if (cached) { setTinted(cached); return; }
    let cancelled = false;
    setTinted(null);
    void loadSource(icon)
      .then((source) => { if (!cancelled) setTinted(tintIcon(icon, color, source)); })
      .catch(() => { /* keep the plain marker circle if the artwork fails to load */ });
    return () => { cancelled = true; };
  }, [icon, color]);
  if (!tinted) return null;
  return <Group rotation={rotation} offsetX={size / 2} offsetY={size / 2} listening={false}>
    <CanvasImage image={tinted} width={size} height={size} />
  </Group>;
}

// Same artwork as a plain <img> for menus/lists outside the Konva canvas.
// When `color` is provided (e.g. in the job list), it is tinted with the contractor colour.
export function MachineGlyph({
  icon,
  color,
  size = 26,
}: {
  icon: MachineIconName;
  color?: string;
  size?: number;
}) {
  const [src, setSrc] = useState<string | null>(() => {
    if (!color) return MACHINE_ICON_URLS[icon];
    const key = `${icon}|${color}`;
    return tintUrls.get(key) ?? null;
  });

  useEffect(() => {
    if (!color) {
      setSrc(MACHINE_ICON_URLS[icon]);
      return;
    }
    const key = `${icon}|${color}`;
    const cached = tintUrls.get(key);
    if (cached) {
      setSrc(cached);
      return;
    }
    let cancelled = false;
    void loadSource(icon)
      .then((source) => {
        if (!cancelled) {
          const url = getTintedUrl(icon, color, source);
          setSrc(url);
        }
      })
      .catch(() => {
        if (!cancelled) setSrc(MACHINE_ICON_URLS[icon]);
      });
    return () => {
      cancelled = true;
    };
  }, [icon, color]);

  return (
    <img
      src={src ?? MACHINE_ICON_URLS[icon]}
      width={size}
      height={size}
      alt=""
      draggable={false}
      style={{
        display: "block",
        mixBlendMode: color && src ? "normal" : "multiply",
        opacity: color && !src ? 0 : 1,
        transition: "opacity 120ms ease-in",
      }}
    />
  );
}
