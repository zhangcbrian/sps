import { loadConfig, loadSpecs } from "@specflow/core";
import type { SpecRule, CategoryConfig } from "@specflow/core";
import { SpecCard } from "@/components/spec-card";

function getRepoRoot(): string {
  return process.env.SPECFLOW_REPO || process.cwd();
}

export default async function DashboardPage() {
  const repoRoot = getRepoRoot();
  const config = loadConfig(repoRoot);
  const specs = loadSpecs(repoRoot, config.specs_dir);
  const categories = config.categories;

  const allRules = specs.flatMap((s) =>
    s.rules.map((r) => ({
      ...r,
      domain: s.domain,
      module: s.module,
      trace: s._trace,
    }))
  );

  const active = allRules.filter((r) => r.status === "active");
  const proposed = allRules.filter((r) => r.status === "proposed");

  // Group by category
  const byCategory = new Map<string, typeof allRules>();
  const uncategorized: typeof allRules = [];

  for (const rule of allRules) {
    const cat = (rule as SpecRule & { category?: string }).category;
    if (cat && categories.find((c) => c.id === cat)) {
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(rule);
    } else {
      uncategorized.push(rule);
    }
  }

  // Also build domain grouping for uncategorized
  const byDomain = new Map<string, typeof allRules>();
  for (const rule of uncategorized) {
    if (!byDomain.has(rule.domain)) byDomain.set(rule.domain, []);
    byDomain.get(rule.domain)!.push(rule);
  }

  return (
    <div>
      <h1 style={{ marginBottom: "8px" }}>Spec Dashboard</h1>
      <p style={{ color: "#999", marginBottom: "32px" }}>
        {active.length} active | {proposed.length} proposed |{" "}
        {specs.length} files | {categories.length} categories
      </p>

      {/* Category summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "16px",
          marginBottom: "40px",
        }}
      >
        {categories.map((cat) => {
          const count = byCategory.get(cat.id)?.length || 0;
          return (
            <a
              key={cat.id}
              href={`#${cat.id}`}
              style={{
                border: `1px solid ${cat.color}33`,
                borderRadius: "12px",
                padding: "20px",
                backgroundColor: `${cat.color}08`,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    color: cat.color,
                    fontWeight: 700,
                    fontSize: "16px",
                  }}
                >
                  {cat.label}
                </span>
                <span
                  style={{
                    color: cat.color,
                    fontSize: "28px",
                    fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              </div>
              <p style={{ color: "#999", fontSize: "13px", margin: 0 }}>
                {cat.description}
              </p>
            </a>
          );
        })}
      </div>

      {/* Categorized specs */}
      {categories.map((cat) => {
        const rules = byCategory.get(cat.id);
        if (!rules || rules.length === 0) return null;
        return (
          <div key={cat.id} id={cat.id} style={{ marginBottom: "40px" }}>
            <h2
              style={{
                color: cat.color,
                borderBottom: `2px solid ${cat.color}33`,
                paddingBottom: "8px",
                marginBottom: "16px",
              }}
            >
              {cat.label}
              <span style={{ color: "#666", fontSize: "14px", fontWeight: 400, marginLeft: "12px" }}>
                {rules.length} rules
              </span>
            </h2>
            {rules.map((rule) => (
              <SpecCard
                key={rule.id || rule.summary}
                rule={rule}
                domain={rule.domain}
                module={rule.module}
                trace={rule.trace}
                categories={categories}
              />
            ))}
          </div>
        );
      })}

      {/* Uncategorized specs (grouped by domain) */}
      {uncategorized.length > 0 && (
        <div style={{ marginBottom: "40px" }}>
          <h2
            style={{
              color: "#999",
              borderBottom: "2px solid #33333333",
              paddingBottom: "8px",
              marginBottom: "16px",
            }}
          >
            Uncategorized
            <span style={{ color: "#666", fontSize: "14px", fontWeight: 400, marginLeft: "12px" }}>
              {uncategorized.length} rules
            </span>
          </h2>
          {[...byDomain.entries()].map(([domain, rules]) => (
            <div key={domain} style={{ marginBottom: "24px" }}>
              <h3
                style={{
                  textTransform: "capitalize",
                  color: "#ccc",
                  fontSize: "16px",
                  marginBottom: "12px",
                }}
              >
                {domain}
              </h3>
              {rules.map((rule) => (
                <SpecCard
                  key={rule.id || rule.summary}
                  rule={rule}
                  domain={rule.domain}
                  module={rule.module}
                  trace={rule.trace}
                  categories={categories}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {specs.length === 0 && (
        <p style={{ color: "#666", textAlign: "center", padding: "48px" }}>
          No specs yet.{" "}
          <a href="/submit" style={{ color: "#00E5A0" }}>
            Submit your first requirement
          </a>
          .
        </p>
      )}
    </div>
  );
}
