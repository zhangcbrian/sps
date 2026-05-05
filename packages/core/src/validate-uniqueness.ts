import type { SpecFile } from "./types.js";

export interface DuplicateIdError {
  id: string;
  occurrences: Array<{
    specFile: string;
    ruleIndex: number;
    ruleTitle: string;
  }>;
}

/**
 * Detects duplicate rule IDs across the spec corpus. A lineage ID must be
 * globally unique — duplicates make the spec→test→PR linkage ambiguous.
 */
export function validateUniqueness(specs: SpecFile[]): DuplicateIdError[] {
  const idMap = new Map<string, DuplicateIdError["occurrences"]>();

  for (const spec of specs) {
    for (let i = 0; i < spec.rules.length; i++) {
      const rule = spec.rules[i];
      if (!rule.id) continue;
      const existing = idMap.get(rule.id) ?? [];
      existing.push({
        specFile: spec.filePath,
        ruleIndex: i,
        ruleTitle: rule.title ?? "(untitled)",
      });
      idMap.set(rule.id, existing);
    }
  }

  const errors: DuplicateIdError[] = [];
  for (const [id, occurrences] of idMap) {
    if (occurrences.length > 1) {
      errors.push({ id, occurrences });
    }
  }
  return errors;
}
