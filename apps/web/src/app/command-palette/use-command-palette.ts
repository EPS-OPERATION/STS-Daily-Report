import { useMemo, useState } from "react";
import { GROUP_LABELS, type Command, type GroupedCommands } from "./command.types.js";
import { matchCommands } from "./command-registry.js";

const GROUP_ORDER = ["recent", "navigate", "actions", "contractors", "zones"] as const;

const MAX_RECENT = 5;
const MAX_PER_GROUP = 6;

export function useCommandPalette(allCommands: Command[]) {
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const byId = useMemo(() => new Map(allCommands.map((c) => [c.id, c])), [allCommands]);

  const groups: GroupedCommands[] = useMemo(() => {
    const searching = query.trim().length > 0;
    const matched = matchCommands(allCommands, query);
    const out: GroupedCommands[] = [];

    if (!searching && recentIds.length > 0) {
      const items = recentIds
        .map((id) => byId.get(id))
        .filter((c): c is Command => Boolean(c))
        .slice(0, MAX_RECENT);
      if (items.length > 0) out.push({ group: "recent", items });
    }

    for (const g of GROUP_ORDER) {
      if (g === "recent") continue;
      const items = matched.filter((c) => c.group === g).slice(0, MAX_PER_GROUP);
      if (items.length > 0) out.push({ group: g, items });
    }
    return out;
  }, [allCommands, query, recentIds, byId]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const activeIndex = Math.max(
    0,
    flat.findIndex((c) => c.id === (activeId ?? flat[0]?.id)),
  );

  const execute = (cmd: Command) => {
    setRecentIds((prev) => [cmd.id, ...prev.filter((id) => id !== cmd.id)].slice(0, MAX_RECENT));
    setQuery("");
    setActiveId(null);
    cmd.action();
  };

  const move = (dir: 1 | -1) => {
    if (flat.length === 0) return;
    const next = (activeIndex + dir + flat.length) % flat.length;
    const cmd = flat[next];
    if (cmd) {
      setActiveId(cmd.id);
      document.getElementById(`cmd-option-${cmd.id}`)?.scrollIntoView({ block: "nearest" });
    }
  };

  return {
    query,
    setQuery: (q: string) => {
      setQuery(q);
      setActiveId(null);
    },
    groups,
    groupLabel: (g: keyof typeof GROUP_LABELS) => GROUP_LABELS[g],
    flat,
    activeIndex,
    activeCommand: flat[activeIndex] ?? null,
    setActive: (id: string) => setActiveId(id),
    move,
    execute,
  };
}
