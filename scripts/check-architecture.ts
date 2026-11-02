// Fails when feature/module dependencies form a cycle (web: apps/web/src/features, api: apps/api/src/modules).
//   bun scripts/check-architecture.ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// ponytail: known cycle kept as-is; remove the entry when it is fixed.
const KNOWN = new Set(["auth -> projects -> auth"]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

// `owner` maps a file path (relative to the scanned root) to the feature/module that contains it.
function graph(root: string, spec: RegExp) {
  const edges = new Map<string, Set<string>>();
  for (const file of walk(root)) {
    const from = relative(root, file).split(/[\\/]/)[0]!;
    for (const m of readFileSync(file, "utf8").matchAll(spec)) {
      const to = m[1]!;
      if (to !== from) edges.set(from, (edges.get(from) ?? new Set()).add(to));
    }
  }
  return edges;
}

function cycles(edges: Map<string, Set<string>>): string[] {
  const found = new Set<string>();
  const visit = (node: string, path: string[]) => {
    for (const next of edges.get(node) ?? []) {
      const at = path.indexOf(next);
      if (at >= 0) {
        const cycle = path.slice(at);
        const first = cycle.indexOf([...cycle].sort()[0]!);
        const ordered = [...cycle.slice(first), ...cycle.slice(0, first)];
        found.add([...ordered, ordered[0]].join(" -> "));
      } else visit(next, [...path, next]);
    }
  };
  for (const node of edges.keys()) visit(node, [node]);
  return [...found];
}

const targets = [
  { name: "web features", root: "apps/web/src/features", spec: /["'`]@\/features\/([a-z-]+)\// },
  { name: "api modules", root: "apps/api/src/modules", spec: /["'`]@\/modules\/([a-z-]+)\// },
];

let bad = 0;
for (const { name, root, spec } of targets) {
  const found = cycles(graph(root, new RegExp(spec.source, "g"))).filter((c) => !KNOWN.has(c));
  if (found.length) bad += found.length;
  console.log(`${name}: ${found.length ? "CYCLES" : "no new cycles"}`);
  for (const c of found) console.log(`  ${c}`);
}
process.exit(bad ? 1 : 0);
