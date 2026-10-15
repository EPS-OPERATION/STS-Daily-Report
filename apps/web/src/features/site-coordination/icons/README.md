# Coordination machinery icons

PNG artwork for the machine markers, named after the icon ids used by the code
(see `../components/machine-icon.tsx`):

`crane.png` · `machinery.png` · `truck.png` · `weld.png` · `pipe.png` · `box.png` · `pin.png` · `road.png`

Format: black silhouette on white, square, centred, ~8% padding, no gradients or text.

At runtime the silhouette is used as an alpha mask and recoloured with the contractor
colour (see `tintIcon`), so a single image serves every company.
