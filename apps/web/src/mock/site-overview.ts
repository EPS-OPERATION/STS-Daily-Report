// Hotspot config for the /site-plan overview ([Image 1] = public/site-plan/site-model-iso.png).
// Each hotspot links an Image-1 label to a real seed zone code (1.1–6.5).
// x/y are % of the image — eyeballed from the render, tweak freely.
// Zones without geometry stay UNMAPPED by design (2.2, 2.3, 2.4, 5.1, 6.4):
// those hotspots fall back to the mapped parent area and say so in the tooltip.
// TR has no zone at all and renders disabled.

export const OVERVIEW_IMAGE_SRC = "/site-plan/site-model-iso.png";

export interface OverviewHotspot {
  label: string;
  /** % from the left edge of the overview image */
  x: number;
  /** % from the top edge of the overview image */
  y: number;
  /** seed zone code; null when the building has no zone */
  zoneCode: string | null;
  /** mapped parent shown when the child itself is unmapped */
  fallbackZoneCode?: string;
}

export const OVERVIEW_HOTSPOTS: OverviewHotspot[] = [
  { label: "Raw Water Pond and Pump", x: 50, y: 5, zoneCode: "6.1" },
  { label: "Water Tank and Pump House", x: 28, y: 13, zoneCode: "6.2" },
  { label: "Water Treatment Plant", x: 16, y: 21, zoneCode: "6.3" },
  { label: "Biomass Transport", x: 89, y: 22, zoneCode: "1.2" },
  { label: "Auxiliary Cooling Tower", x: 9, y: 29, zoneCode: null, fallbackZoneCode: "6" },
  { label: "Boiler", x: 64, y: 30, zoneCode: "2.1" },
  { label: "TR", x: 43, y: 35, zoneCode: null },
  { label: "Compressor Room", x: 6, y: 37, zoneCode: "6.5" },
  { label: "TG Building", x: 33, y: 39, zoneCode: "4.1" },
  { label: "ACC", x: 15, y: 51, zoneCode: null, fallbackZoneCode: "5" },
  { label: "Bottom Ash Bunker", x: 79, y: 52, zoneCode: null, fallbackZoneCode: "2" },
  { label: "Fly Ash Silo", x: 73, y: 60, zoneCode: null, fallbackZoneCode: "2" },
  { label: "Stack", x: 33, y: 68, zoneCode: "3.2" },
  { label: "Diesel Oil Tank", x: 63, y: 72, zoneCode: null, fallbackZoneCode: "2" },
  { label: "FGT", x: 53, y: 78, zoneCode: "3.1" },
];
