import { loadConfig, loadSpecs } from "@specflow/core";
import { SpecCard } from "@/components/spec-card";

function getRepoRoot(): string {
  return process.env.SPECFLOW_REPO || process.cwd();
}

export default async function DashboardPage() {
  const repoRoot = getRepoRoot();
  const config = loadConfig(repoRoot);
  const specs = loadSpecs(repoRoot, config.specs_dir);

  const allRules = specs.flatMap((s) =>
    s.rules.map((r) => ({ ...r, domain: s.domain, module: s.module }))
  );
  const active = allRules.filter((r) => r.status === "active");
  const proposed = allRules.filter((r) => r.status === "proposed");

  // Group specs by domain
  const byDomain = new Map<string, typeof specs>();
  for (const spec of specs) {
    if (!byDomain.has(spec.domain)) byDomain.set(spec.domain, []);
    byDomain.get(spec.domain)!.push(spec);
  }

  return (
    <div>
      <h1 style={{ marginBottom: "8px" }}>Spec Dashboard</h1>
      <p style={{ color: "#999", marginBottom: "24px" }}>
        {active.length} active rules | {proposed.length} proposed |{" "}
        {specs.length} spec files
      </p>

      {Array.from(byDomain.entries()).map(([domain, domainSpecs]) => (
        <div key={domain} style={{ marginBottom: "32px" }}>
          <h2
            style={{
              textTransform: "capitalize",
              borderBottom: "1px solid #333",
              paddingBottom: "8px",
            }}
          >
            {domain}
          </h2>
          {domainSpecs.map((spec) =>
            spec.rules.map((rule) => (
              <SpecCard
                key={rule.id || rule.summary}
                rule={rule}
                domain={spec.domain}
                module={spec.module}
                trace={spec._trace}
              />
            ))
          )}
        </div>
      ))}

      {specs.length === 0 && (
        <p style={{ color: "#666", textAlign: "center", padding: "48px" }}>
          No specs yet. <a href="/submit" style={{ color: "#00E5A0" }}>Submit your first requirement</a>.
        </p>
      )}
    </div>
  );
}
