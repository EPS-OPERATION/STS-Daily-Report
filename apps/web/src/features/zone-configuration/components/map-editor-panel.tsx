import ChevronRightOutlinedIcon from "@mui/icons-material/ChevronRightOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { TreeItem } from "@mui/x-tree-view/TreeItem";
import type { useSitePlanEditor } from "../hooks/use-zone-configuration-editor.js";
import { normalizeZoneColor } from "../utils/zone-color.js";
import { buildZoneTree, type ZoneTreeNode } from "@/features/site-plan/utils/site-plan-map.js";
import type { OverlapSeverity } from "@/features/site-plan/utils/polygon-overlap.js";
import type { ZoneOption } from "@/features/site-plan/types/site-plan.types.js";

type Editor = ReturnType<typeof useSitePlanEditor>;

export interface PanelOverlapItem {
  key: string;
  zoneAId: string;
  zoneBId: string;
  severity: OverlapSeverity;
  overlapRatio: number;
}

function severityLabel(severity: OverlapSeverity): string {
  return severity === "strong" ? "High" : "Warning";
}

export function MapEditorPanel({
  editor,
  zones,
  focusedParentId,
  zonesLoading,
  mappedZoneIds,
  colorDrafts,
  saving,
  saveError,
  onZoneSelect,
  onShowAllZones,
  physicalTotal,
  mappedLeafCount,
  unmappedLeafCount,
  overlaps,
  reviewKey,
  onFocusOverlap,
  onEditBoundary,
  issueZoneIds,
  issueSeverityByZone,
}: {
  editor: Editor;
  zones: ZoneOption[];
  focusedParentId: string | null;
  zonesLoading: boolean;
  mappedZoneIds: Set<string>;
  colorDrafts: Record<string, string>;
  saving: boolean;
  saveError: string | null;
  onZoneSelect: (zoneId: string | null) => void;
  onShowAllZones: () => void;
  physicalTotal: number;
  mappedLeafCount: number;
  unmappedLeafCount: number;
  overlaps: PanelOverlapItem[];
  reviewKey: string | null;
  onFocusOverlap: (zoneAId: string, zoneBId: string) => void;
  onEditBoundary: (zoneId: string) => void;
  issueZoneIds: string[];
  issueSeverityByZone: Record<string, OverlapSeverity>;
}) {
  const [tab, setTab] = useState<"zones" | "issues">("zones");
  const [inspectedKey, setInspectedKey] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const trees = useMemo(() => buildZoneTree(zones), [zones]);
  const parentIds = useMemo(() => new Set(zones.flatMap((zone) => (zone.parentId ? [zone.parentId] : []))), [zones]);
  const issueIdSet = useMemo(() => new Set(issueZoneIds), [issueZoneIds]);
  // A resolved issue closes its inspector automatically.
  const inspected = overlaps.find((overlap) => overlap.key === inspectedKey) ?? null;

  useEffect(() => {
    const allParents = zones.filter((zone) => zones.some((child) => child.parentId === zone.id)).map((zone) => zone.id);
    setExpandedItems(allParents);
  }, [zones]);

  useEffect(() => {
    let current = zones.find((zone) => zone.id === (editor.selectedZoneId ?? focusedParentId));
    const ancestors: string[] = [];
    while (current?.parentId) {
      ancestors.push(current.parentId);
      current = zones.find((zone) => zone.id === current?.parentId);
    }
    if (ancestors.length > 0) {
      setExpandedItems((previous) => [...new Set([...previous, ...ancestors])]);
    }
  }, [editor.selectedZoneId, focusedParentId, zones]);

  const renderTreeNode = (node: ZoneTreeNode<ZoneOption>) => {
    const isGroup = parentIds.has(node.zone.id);
    const zoneColor = normalizeZoneColor(colorDrafts[node.zone.id] ?? "") ?? node.zone.displayColor;
    const mapped = mappedZoneIds.has(node.zone.id);
    const issueSeverity = issueIdSet.has(node.zone.id) ? issueSeverityByZone[node.zone.id] : undefined;
    return (
      <TreeItem
        key={node.zone.id}
        itemId={node.zone.id}
        disabled={saving || Boolean(editor.drawing)}
        label={
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
              {isGroup ? null : (
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
              )}
              <Typography variant="body2" noWrap>
                {node.zone.code} {node.zone.name}
              </Typography>
              {issueSeverity ? (
                <Typography
                  variant="caption"
                  title="Involved in a geometry issue"
                  color={issueSeverity === "strong" ? "error.main" : "warning.main"}
                  sx={{ fontWeight: 700, flexShrink: 0 }}
                >
                  ⚠
                </Typography>
              ) : null}
            </Stack>
            {isGroup ? null : mapped ? (
              <Typography variant="caption" color="success.main" sx={{ flexShrink: 0 }}>
                ✓
              </Typography>
            ) : (
              <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                ○ Unmapped
              </Typography>
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

  const openIssue = (overlap: PanelOverlapItem) => {
    onFocusOverlap(overlap.zoneAId, overlap.zoneBId);
    setInspectedKey(overlap.key);
  };

  const renderInspector = () => {
    if (!inspected) return null;
    const zoneA = zones.find((zone) => zone.id === inspected.zoneAId);
    const zoneB = zones.find((zone) => zone.id === inspected.zoneBId);
    if (!zoneA || !zoneB) return null;
    return (
      <Stack spacing={1.5}>
        <Button size="small" color="inherit" sx={{ alignSelf: "flex-start" }} onClick={() => setInspectedKey(null)}>
          ‹ Back to issues
        </Button>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Geometry Issue
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {zoneA.code} {zoneA.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            overlaps
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {zoneB.code} {zoneB.name}
          </Typography>
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Overlap {Math.round(inspected.overlapRatio * 100)}% · {severityLabel(inspected.severity)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review the physical boundaries of these areas.
          </Typography>
        </Box>
        <Button variant="contained" disabled={saving} onClick={() => onEditBoundary(zoneA.id)}>
          Edit {zoneA.code} boundary
        </Button>
        <Button variant="outlined" color="inherit" disabled={saving} onClick={() => onEditBoundary(zoneB.id)}>
          Edit {zoneB.code} boundary
        </Button>
      </Stack>
    );
  };

  return (
    <Stack spacing={2} sx={{ height: "100%" }}>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {mappedLeafCount} / {physicalTotal} mapped · {unmappedLeafCount} unmapped
        </Typography>
        {overlaps.length > 0 ? (
          <Button
            size="small"
            color="warning"
            startIcon={<WarningAmberOutlinedIcon fontSize="small" />}
            onClick={() => setTab("issues")}
            sx={{ mt: 0.5, px: 0 }}
          >
            {overlaps.length} issue{overlaps.length === 1 ? "" : "s"}
          </Button>
        ) : null}
      </Box>

      {saveError ? <Alert severity="error">{saveError}</Alert> : null}

      <Tabs
        value={tab}
        onChange={(_, value: "zones" | "issues") => {
          setTab(value);
          if (value === "zones") setInspectedKey(null);
        }}
        aria-label="Zone configuration modes"
      >
        <Tab value="zones" label="Zones" />
        <Tab value="issues" label={overlaps.length > 0 ? `Issues ${overlaps.length}` : "Issues"} />
      </Tabs>

      {tab === "zones" ? (
        <>
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
                selectedItems={editor.selectedZoneId ?? focusedParentId}
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
        </>
      ) : inspected ? (
        renderInspector()
      ) : (
        <Box>
          <Typography variant="h6">Map Quality</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {overlaps.length === 0
              ? "No geometry issues."
              : `${overlaps.length} area${overlaps.length === 1 ? "" : "s"} need${overlaps.length === 1 ? "s" : ""} review`}
          </Typography>
          <Stack spacing={1}>
            {overlaps.map((overlap) => {
              const zoneA = zones.find((zone) => zone.id === overlap.zoneAId);
              const zoneB = zones.find((zone) => zone.id === overlap.zoneBId);
              if (!zoneA || !zoneB) return null;
              const strong = overlap.severity === "strong";
              const active = reviewKey === overlap.key;
              return (
                <Button
                  key={overlap.key}
                  onClick={() => openIssue(overlap)}
                  disabled={saving}
                  sx={{
                    justifyContent: "flex-start",
                    textAlign: "left",
                    textTransform: "none",
                    p: 1.25,
                    border: "1px solid",
                    borderColor: active ? (strong ? "error.main" : "warning.main") : "divider",
                    borderWidth: active ? 2 : 1,
                    borderRadius: 2,
                    color: "text.primary",
                  }}
                >
                  <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ width: "100%" }}>
                    <WarningAmberOutlinedIcon
                      fontSize="small"
                      color={strong ? "error" : "warning"}
                      sx={{ mt: 0.25, flexShrink: 0 }}
                    />
                    <Stack spacing={0.25} sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {zoneA.code} {zoneA.name} ↔ {zoneB.code} {zoneB.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {Math.round(overlap.overlapRatio * 100)}% overlap · {severityLabel(overlap.severity)}
                      </Typography>
                    </Stack>
                    <ChevronRightOutlinedIcon fontSize="small" color="action" sx={{ mt: 0.25, flexShrink: 0 }} />
                  </Stack>
                </Button>
              );
            })}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
