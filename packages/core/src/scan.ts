import type { SpecFile, SpsConfig, Manifest } from "./types.js";

export function buildManifest(specs: SpecFile[], _config: SpsConfig): Manifest {
  const entries = specs.map((spec) => {
    const statusCounts: Record<string, number> = {};
    const categoriesSet = new Set<string>();

    for (const rule of spec.rules) {
      statusCounts[rule.status] = (statusCounts[rule.status] || 0) + 1;
      categoriesSet.add(rule.category);
    }

    return {
      path: spec.filePath,
      spec: spec.spec,
      title: spec.title,
      categories: [...categoriesSet],
      rule_count: spec.rules.length,
      touches: spec.touches || [],
      status_summary: statusCounts,
    };
  });

  // Totals
  let totalRules = 0;
  const byCat: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const entry of entries) {
    totalRules += entry.rule_count;
    const spec = specs.find((s) => s.filePath === entry.path)!;
    for (const rule of spec.rules) {
      byCat[rule.category] = (byCat[rule.category] || 0) + 1;
    }
    for (const [status, count] of Object.entries(entry.status_summary)) {
      byStatus[status] = (byStatus[status] || 0) + count;
    }
  }

  // Cross-references
  const crossRefs: Manifest["cross_references"] = {};
  for (const spec of specs) {
    for (const touched of spec.touches || []) {
      if (!crossRefs[touched]) {
        crossRefs[touched] = { touched_by: [] };
      }
      crossRefs[touched].touched_by.push({
        spec: spec.spec,
        path: spec.filePath,
        rules: spec.rules.filter((r) => r.id).map((r) => r.id!),
      });
    }
  }

  // Drift detection
  const drift: Manifest["drift"] = [];
  for (const spec of specs) {
    const specParts = spec.spec.split("/");
    const pathSegments = spec.filePath.replace(/\\/g, "/").split("/");
    // Remove filename to get directory segments only
    const dirSegments = pathSegments.slice(0, -1).map((s) => s.toLowerCase());
    for (const part of specParts) {
      if (!dirSegments.includes(part.toLowerCase())) {
        drift.push({
          path: spec.filePath,
          issue: `declared spec '${spec.spec}' but file path '${spec.filePath}' does not contain '${part}' as a directory segment`,
        });
        break;
      }
    }
  }

  return {
    generated_at: new Date().toISOString(),
    specs: entries,
    totals: {
      files: entries.length,
      rules: totalRules,
      by_category: byCat,
      by_status: byStatus,
    },
    cross_references: crossRefs,
    drift,
  };
}
