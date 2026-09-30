import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useEffect, useMemo, useState } from "react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import type { useSitePlanEditor } from "../hooks/use-zone-configuration-editor.js";
import { normalizeZoneColor } from "../utils/zone-color.js";
import { buildZoneTree, type ZoneTreeNode } from "@/features/site-plan/utils/site-plan-map.js";
import type { ZoneOption } from "@/features/site-plan/types/site-plan.types.js";

type Editor = ReturnType<typeof useSitePlanEditor>;

export function MapEditorPanel({
  editor,
  zones,
  zonesLoading,
  mappedZoneIds,
  colorDrafts,
  saving,
  saveError,
  onZoneSelect,
  onShowAllZones,
}: {
  editor: Editor;
  zones: ZoneOption[];
  zonesLoading: boolean;
  mappedZoneIds: Set<string>;
  colorDrafts: Record<string, string>;
  saving: boolean;
  saveError: string | null;
  onZoneSelect: (zoneId: string | null) => void;
  onShowAllZones: () => void;
}) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const trees = useMemo(() => buildZoneTree(zones), [zones]);

  useEffect(() => {
    const parentIds = zones.filter((zone) => zones.some((child) => child.parentId === zone.id)).map((zone) => zone.id);
    setExpandedItems(parentIds);
  }, [zones]);

  useEffect(() => {
    let current = zones.find((zone) => zone.id === editor.selectedZoneId);
    const ancestors: string[] = [];
    while (current?.parentId) {
      ancestors.push(current.parentId);
      current = zones.find((zone) => zone.id === current?.parentId);
    }
    if (ancestors.length > 0) {
      setExpandedItems((previous) => [...new Set([...previous, ...ancestors])]);
    }
  }, [editor.selectedZoneId, zones]);

  const renderTreeNode = (node: ZoneTreeNode<ZoneOption>) => {
    const zoneColor = normalizeZoneColor(colorDrafts[node.zone.id] ?? "") ?? node.zone.displayColor;
    const mapped = mappedZoneIds.has(node.zone.id);
    return (
      <TreeItem
        key={node.zone.id}
        itemId={node.zone.id}
        disabled={saving || Boolean(editor.drawing)}
        sx={
          mapped
            ? undefined
            : (theme) => ({
                "& .MuiTreeItem-content": {
                  bgcolor: alpha(theme.palette.warning.main, 0.1),
                  borderRadius: 1,
                },
              })
        }
        label={
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
              <Box
                aria-hidden="true"
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  bgcolor: zoneColor,
                  border: "1px solid",
                  borderColor: "divider",
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" noWrap>
                {node.zone.code} {node.zone.name}
              </Typography>
            </Stack>
            {mapped ? (
              <Typography variant="caption" color="success.main" sx={{ flexShrink: 0 }}>
                ✓ Mapped
              </Typography>
            ) : (
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                <Box
                  aria-hidden="true"
                  sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "warning.main", flexShrink: 0 }}
                />
                <Typography variant="caption" color="warning.dark" sx={{ fontWeight: 700 }}>
                  Unmapped
                </Typography>
              </Stack>
            )}
          </Stack>
        }
      >
        {node.children.map(renderTreeNode)}
      </TreeItem>
    );
  };

  const selectTreeZone = (zoneId: string | null) => {
    if (zoneId) {
      let current = zones.find((zone) => zone.id === zoneId);
      const ancestors: string[] = [];
      while (current?.parentId) {
        ancestors.push(current.parentId);
        current = zones.find((zone) => zone.id === current?.parentId);
      }
      setExpandedItems((previous) => [...new Set([...previous, ...ancestors])]);
    }
    onZoneSelect(zoneId);
  };

  return (
    <Stack spacing={2} sx={{ height: "100%" }}>
      <Box>
        <Typography variant="h6">WBS Zones</Typography>
        <Typography variant="body2" color="text.secondary">
          Mapped {mappedZoneIds.size} / {zones.length} · Unmapped {Math.max(0, zones.length - mappedZoneIds.size)}
        </Typography>
      </Box>

      {saveError ? <Alert severity="error">{saveError}</Alert> : null}

      <Button
        variant="outlined"
        color="inherit"
        size="small"
        onClick={onShowAllZones}
        disabled={saving || Boolean(editor.drawing)}
      >
        All Zones
      </Button>

      <Box sx={{ height: 320, overflow: "auto", pr: 0.5, flexShrink: 0 }}>
        {zonesLoading ? (
          <LinearProgress aria-label="Loading WBS zones" />
        ) : zones.length > 0 ? (
          <SimpleTreeView
            aria-label="WBS zones"
            selectedItems={editor.selectedZoneId}
            expandedItems={expandedItems}
            expansionTrigger="iconContainer"
            onSelectedItemsChange={(_, itemIds) => selectTreeZone(typeof itemIds === "string" ? itemIds : null)}
            onExpandedItemsChange={(_, itemIds) => setExpandedItems(itemIds)}
          >
            {trees.map(renderTreeNode)}
          </SimpleTreeView>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No WBS zones are configured for this project.
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
