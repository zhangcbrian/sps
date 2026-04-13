import type {
  DraftSpec,
  SpecFile,
  SpsConfig,
  OrganizeResult,
} from "./types.js";

export function organize(
  draft: DraftSpec,
  existingSpecs: SpecFile[],
  config: SpsConfig
): OrganizeResult {
  // Parse spec identity: "checkout/coupons" → domain="checkout", module="coupons"
  const parts = draft.spec.split("/");
  const domain = parts[0];
  const module = parts.length > 1 ? parts[parts.length - 1] : domain;

  // Generate co-located file path
  const specPath = parts.join("/");
  const filePath = `src/${specPath}/${module}.sps.yaml`;

  const existingFile = existingSpecs.find((s) => s.spec === draft.spec);
  const isNewFile = !existingFile;

  // Generate lineage IDs
  const domainAbbrev =
    config.domains[domain]?.toUpperCase() || domain.toUpperCase();
  const moduleAbbrev = module.toUpperCase();
  const idPrefix = `REQ-${domainAbbrev}-${moduleAbbrev}-`;

  let maxId = 0;
  for (const spec of existingSpecs) {
    for (const rule of spec.rules) {
      if (rule.id && rule.id.startsWith(idPrefix)) {
        const num = parseInt(rule.id.slice(idPrefix.length), 10);
        if (num > maxId) maxId = num;
      }
    }
  }

  const assignedIds = new Map<number, string>();
  let nextId = maxId + 1;
  for (let i = 0; i < draft.rules.length; i++) {
    if (!draft.rules[i].id) {
      assignedIds.set(
        i,
        `${idPrefix}${String(nextId).padStart(2, "0")}`
      );
      nextId++;
    }
  }

  return {
    filePath,
    spec: draft.spec,
    assignedIds,
    isNewFile,
  };
}
