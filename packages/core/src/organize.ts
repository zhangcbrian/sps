import type {
  DraftSpec,
  SpecFile,
  SpecflowConfig,
  OrganizeResult,
} from "./types.js";

export function organize(
  draft: DraftSpec,
  existingSpecs: SpecFile[],
  config: SpecflowConfig
): OrganizeResult {
  const filePath = `${config.specs_dir}/${draft.domain}/${draft.module}.spec.yaml`;

  const existingFile = existingSpecs.find(
    (s) => s.domain === draft.domain && s.module === draft.module
  );
  const isNewFile = !existingFile;

  const domainAbbrev =
    config.domains[draft.domain]?.toUpperCase() ||
    draft.domain.toUpperCase();
  const moduleAbbrev = draft.module.toUpperCase();
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
    domain: draft.domain,
    module: draft.module,
    assignedIds,
    isNewFile,
  };
}
