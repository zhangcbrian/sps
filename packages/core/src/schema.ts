import type { SpecFile, SchemaConfig, CategoryConfig } from "./types.js";

export function validateSpec(
  spec: SpecFile,
  schema: SchemaConfig,
  categories?: CategoryConfig[]
): string[] {
  const errors: string[] = [];
  const parsed = spec as unknown as Record<string, unknown>;

  for (const key of schema.required_fields) {
    if (!(key in parsed)) {
      errors.push(`Missing required top-level key "${key}".`);
    }
  }

  const rules = parsed.rules;
  if (!Array.isArray(rules)) {
    errors.push('"rules" must be an array.');
    return errors;
  }

  const validCategoryIds = categories
    ? new Set(categories.map((c) => c.id))
    : null;

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
          `${prefix}: forbidden field "${field}". Use "title" instead.`
        );
      }
    }

    for (const field of schema.required_rule_fields) {
      if (!(field in rule)) {
        errors.push(`${prefix}: missing required field "${field}".`);
      }
    }

    if (
      rule.status &&
      !["active", "proposed", "deprecated", "superseded", "removed"].includes(
        rule.status as string
      )
    ) {
      errors.push(
        `${prefix}: "status" must be one of: active, proposed, deprecated, superseded, removed.`
      );
    }

    if (rule.status === "superseded") {
      if (
        rule.superseded_by === undefined ||
        rule.superseded_by === null ||
        rule.superseded_by === ""
      ) {
        errors.push(
          `${prefix}: rules with status="superseded" must declare \`superseded_by: REQ-…\`.`
        );
      } else if (typeof rule.superseded_by !== "string") {
        errors.push(
          `${prefix}: \`superseded_by\` must be a string lineage ID (got ${typeof rule.superseded_by}).`
        );
      }
    } else if (
      rule.superseded_by !== undefined &&
      rule.superseded_by !== null &&
      typeof rule.superseded_by !== "string"
    ) {
      errors.push(
        `${prefix}: \`superseded_by\` must be a string lineage ID (got ${typeof rule.superseded_by}).`
      );
    }

    if (rule.behavior !== undefined) {
      if (
        typeof rule.behavior !== "object" ||
        rule.behavior === null ||
        Array.isArray(rule.behavior)
      ) {
        errors.push(`${prefix}.behavior: must be an object.`);
      } else {
        const b = rule.behavior as Record<string, unknown>;
        if (typeof b.surface !== "string" || b.surface.length === 0) {
          errors.push(
            `${prefix}.behavior.surface: required string (function path, route, or component identifier).`
          );
        }

        if ("invariants" in b) {
          if (!Array.isArray(b.invariants)) {
            errors.push(
              `${prefix}.behavior.invariants: must be an array of strings.`
            );
          } else {
            for (let j = 0; j < b.invariants.length; j++) {
              if (typeof b.invariants[j] !== "string") {
                errors.push(
                  `${prefix}.behavior.invariants[${j}]: must be a string.`
                );
              }
            }
          }
        }

        for (const ioField of ["inputs", "outputs"] as const) {
          if (!(ioField in b)) continue;
          const value = b[ioField];
          if (
            typeof value !== "object" ||
            value === null ||
            Array.isArray(value)
          ) {
            errors.push(
              `${prefix}.behavior.${ioField}: must be an object mapping field names to type descriptions.`
            );
            continue;
          }
          for (const [k, v] of Object.entries(
            value as Record<string, unknown>
          )) {
            if (typeof v !== "string") {
              errors.push(
                `${prefix}.behavior.${ioField}.${k}: must be a string type description.`
              );
            }
          }
        }

        if ("errors" in b) {
          if (!Array.isArray(b.errors)) {
            errors.push(`${prefix}.behavior.errors: must be an array.`);
          } else {
            for (let j = 0; j < b.errors.length; j++) {
              const e = b.errors[j] as Record<string, unknown>;
              if (
                !e ||
                typeof e !== "object" ||
                typeof e.code !== "string" ||
                typeof e.when !== "string"
              ) {
                errors.push(
                  `${prefix}.behavior.errors[${j}]: must be { code: string, when: string }.`
                );
              }
            }
          }
        }
      }
    }

    if ("category" in rule && validCategoryIds) {
      if (
        typeof rule.category !== "string" ||
        !validCategoryIds.has(rule.category)
      ) {
        errors.push(
          `${prefix}: "category" must be one of: ${[...validCategoryIds].join(", ")}. Found: "${rule.category}"`
        );
      }
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
