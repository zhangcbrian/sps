import { loadConfig, loadSpecs } from "@specflow/core";
import { SpecCard } from "@/components/spec-card";

function getRepoRoot(): string {
  return process.env.SPECFLOW_REPO || process.cwd();
}

export default async function SpecsPage() {
  const repoRoot = getRepoRoot();
  const config = loadConfig(repoRoot);
  const specs = loadSpecs(repoRoot, config.specs_dir);

  return (
    <div>
      <h1>All Specs</h1>
      <p style={{ color: "#999", marginBottom: "24px" }}>
        {specs.reduce((n, s) => n + s.rules.length, 0)} rules across{" "}
        {specs.length} files
      </p>

      {specs.map((spec) => (
        <div key={spec.filePath} style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "18px", color: "#ccc" }}>
            {spec.domain}/{spec.module}
          </h2>
          <p style={{ color: "#666", fontSize: "13px", marginBottom: "12px" }}>
            {spec.filePath}
          </p>
          {spec.rules.map((rule) => (
            <SpecCard
              key={rule.id || rule.summary}
              rule={rule}
              domain={spec.domain}
              module={spec.module}
              trace={spec._trace}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
