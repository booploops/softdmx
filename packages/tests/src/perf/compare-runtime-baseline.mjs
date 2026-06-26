/*
 * Copyright (C) 2025-Present booploops and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import fs from "node:fs/promises";

function indexMetrics(report) {
  return new Map((report.metrics ?? []).map((metric) => [metric.name, metric]));
}

function formatDelta(before, after) {
  const pct = before > 0 ? ((after - before) / before) * 100 : 0;
  return `${after.toFixed(3)}ms (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)`;
}

async function readReport(path) {
  const content = await fs.readFile(path, "utf8");
  return JSON.parse(content);
}

async function main() {
  const [, , beforePath, afterPath] = process.argv;
  if (!beforePath || !afterPath) {
    console.error("Usage: node compare-runtime-baseline.mjs <before.json> <after.json>");
    process.exit(1);
  }

  const before = await readReport(beforePath);
  const after = await readReport(afterPath);
  const beforeMetrics = indexMetrics(before);
  const afterMetrics = indexMetrics(after);
  const keys = [...new Set([...beforeMetrics.keys(), ...afterMetrics.keys()])].sort();

  const lines = [];
  lines.push(`# Runtime Baseline Comparison`);
  lines.push(`Before: ${beforePath}`);
  lines.push(`After: ${afterPath}`);
  lines.push("");
  lines.push("| Metric | Before avg | After avg | Before p95 | After p95 |");
  lines.push("| --- | ---: | ---: | ---: | ---: |");

  for (const key of keys) {
    const b = beforeMetrics.get(key);
    const a = afterMetrics.get(key);
    lines.push(
      `| ${key} | ${b ? `${b.avgMs.toFixed(3)}ms` : "-"} | ${
        b && a ? formatDelta(b.avgMs, a.avgMs) : a ? `${a.avgMs.toFixed(3)}ms` : "-"
      } | ${b ? `${b.p95Ms.toFixed(3)}ms` : "-"} | ${
        b && a ? formatDelta(b.p95Ms, a.p95Ms) : a ? `${a.p95Ms.toFixed(3)}ms` : "-"
      } |`,
    );
  }

  console.log(lines.join("\n"));
}

await main();
