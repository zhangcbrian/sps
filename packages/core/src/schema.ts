import type { SpecFile, SchemaConfig } from "./types.js";

export function validateSpec(
  spec: SpecFile,
  schema: SchemaConfig
): string[] {
  const errors: string[] = [];
  const parsed = spec as unknown as Record<string, unknown>;

  for (const key of schema.required_top_level) {
    if (!(key in parsed)) {
      errors.push(`Missing required top-level key "${key}".`);
    }
  }

  const rules = parsed.rules;
  if (!Array.isArray(rules)) {
    errors.push('"rules" must be an array.');
    return errors;
  }

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i] as Record<string, unknown>;
    const prefix = `rules[${i}]`;

    if (!rule || typeof rule !== "object") {
      errors.push(`${prefix}: must be an object.`);
      continue;
    }

    for (const field of schema.forbidden_rule_fields) {
      if (field in rule) {
        errors.push(
          `${prefix}: forbidden field "${field}". Use "summary" instead.`
        );
      }
    }

    for (const field of schema.required_rule_fields) {
      if (!(field in rule)) {
        errors.push(`${prefix}: missing required field "${field}".`);
      }
    }

    if (
      "added" in rule &&
      rule.added !== null &&
      typeof rule.added === "object"
    ) {
      errors.push(
        `${prefix}: "added" must be a date string "YYYY-MM-DD", not an object.`
      );
    }

    if (
      rule.status &&
      !["active", "proposed", "deprecated"].includes(rule.status as string)
    ) {
      errors.push(
        `${prefix}: "status" must be "active", "proposed", or "deprecated".`
      );
    }

    for (const field of ["given", "when", "then"]) {
      if (field in rule && Array.isArray(rule[field])) {
        errors.push(
          `${prefix}: "${field}" must be a string, not an array.`
        );
      }
    }
  }

  return errors;
}
