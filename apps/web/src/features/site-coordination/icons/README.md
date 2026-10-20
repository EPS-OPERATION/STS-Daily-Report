# Coordination machinery icons

WebP artwork for the machine markers, named after the icon ids used by the code
(see `../components/machine-icon.tsx`):

`crane.webp` · `machinery.webp` · `truck.webp` · `weld.webp` · `pipe.webp` · `box.webp` · `pin.webp` · `road.webp`

Format: black silhouette on white, square, centred, ~8% padding, no gradients or text.
Size: 320×320 (the markers are tinted at 160px, shown at ~40px). Keep new icons at this size:
the original 1254px PNGs were ~250 KB each and made the first map load ~1.7 MB heavier.
To add or replace one: `Image.open(src).resize((320, 320), Image.LANCZOS).save("name.webp", "WEBP", quality=92, method=6, alpha_quality=100)` (Pillow).

At runtime the silhouette is used as an alpha mask and recoloured with the contractor
colour (see `tintIcon`), so a single image serves every company.
