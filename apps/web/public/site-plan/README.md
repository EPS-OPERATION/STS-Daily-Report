# apps/web/public/site-plan/

Drop the cropped STS Master Layout drawing here as `master-layout.jpg`.

- The interactive Site Plan (`/site-plan`) renders it as the background
  with transparent SVG WBS overlays on top.
- Without this file the map falls back to the schematic grid.
- The original full drawing (title block, revisions, legend) can live
  here under another name for reference.
- Object-storage uploads (MinIO `background_object_key`) plug in later;
  this static file is the temporary development background.

`STS_KY_Layout_Plan.preview.webp` is the light copy the live Map loads (phones never load the full PNG).
Replace the PNG -> regenerate the preview (~3200px wide, WebP q80, same aspect), e.g.
`magick STS_KY_Layout_Plan.png -resize 3200x STS_KY_Layout_Plan.preview.webp`.
