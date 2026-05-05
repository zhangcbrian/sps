import { loadConfig, loadSpecs, loadPrinciples } from "@specflow/core";
import type { SpecRule, CategoryConfig } from "@specflow/core";
import { SpecCard } from "@/components/spec-card";

function getRepoRoot(): string {
  return process.env.SPS_REPO || process.cwd();
}

export default async function DashboardPage() {
  const repoRoot = getRepoRoot();
  const config = loadConfig(repoRoot);
  const specs = loadSpecs(repoRoot);
  const categories = config.categories;
  const principles = loadPrinciples(repoRoot);

  const allRules = specs.flatMap((s) =>
    s.rules.map((r) => ({
      ...r,
      spec: s.spec,
      trace: s._trace,
    }))
  );

  const active = allRules.filter((r) => r.status === "active");
  const proposed = allRules.filter((r) => r.status === "proposed");

  // Group by category
  const byCategory = new Map<string, typeof allRules>();
  const uncategorized: typeof allRules = [];

  for (const rule of allRules) {
    const cat = rule.category;
    if (cat && categories.find((c) => c.id === cat)) {
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(rule);
    } else {
      uncategorized.push(rule);
    }
  }

  // Also build spec grouping for uncategorized
  const bySpec = new Map<string, typeof allRules>();
  for (const rule of uncategorized) {
    if (!bySpec.has(rule.spec)) bySpec.set(rule.spec, []);
    bySpec.get(rule.spec)!.push(rule);
  }

  return (
    <div>
      <h1 style={{ marginBottom: "8px" }}>Spec Dashboard</h1>
      <p style={{ color: "#999", marginBottom: "32px" }}>
        {active.length} active | {proposed.length} proposed |{" "}
        {specs.length} files | {categories.length} categories
      </p>

      {/* Principles */}
      {principles.length > 0 && (
        <div
          style={{
            border: "1px solid #333",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "32px",
            backgroundColor: "#111",
          }}
        >
          <h3 style={{ margin: "0 0 12px 0", color: "#ccc", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px" }}>
            Team Principles
          </h3>
          {principles.map((p) => (
            <div key={p.id} style={{ marginBottom: "8px" }}>
              <span style={{ color: "#fff", fontWeight: 600 }}>{p.title}</span>
              <span style={{ color: "#888" }}> — {p.description}</span>
            </div>
          ))}
        </div>
      )}

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
                key={rule.id || rule.title}
                rule={rule}
                spec={rule.spec}
                trace={rule.trace}
                categories={categories}
              />
            ))}
          </div>
        );
      })}

      {/* Uncategorized specs (grouped by spec) */}
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
          {[...bySpec.entries()].map(([spec, rules]) => (
            <div key={spec} style={{ marginBottom: "24px" }}>
              <h3
                style={{
                  textTransform: "capitalize",
                  color: "#ccc",
                  fontSize: "16px",
                  marginBottom: "12px",
                }}
              >
                {spec}
              </h3>
              {rules.map((rule) => (
                <SpecCard
                  key={rule.id || rule.title}
                  rule={rule}
                  spec={rule.spec}
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
