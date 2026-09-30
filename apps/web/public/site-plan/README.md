# Site Plan base drawing

`master-layout-map.png` is the monochrome 1586 × 992 engineering drawing used as map context.
It contains no WBS labels, status colors, or zone overlays. Konva renders normalized PostgreSQL
geometry above the drawing for both Site Activity and Zone Configuration.

For local development, the frontend uses `/site-plan/master-layout-map.png` when the selected
Site Plan has no `background_object_key`. When a plan has an object key, the authenticated API
returns a short-lived MinIO URL. The plan's stored width and height define the logical coordinate
space; geometry remains normalized from 0 to 1.
