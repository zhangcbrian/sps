import { loadSpecs } from "@sls/core";
import { SpecCard } from "@/components/spec-card";

function getRepoRoot(): string {
  return process.env.SPS_REPO || process.cwd();
}

export default async function SpecsPage() {
  const repoRoot = getRepoRoot();
  const specs = loadSpecs(repoRoot);

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
            {spec.spec}
          </h2>
          <p style={{ color: "#666", fontSize: "13px", marginBottom: "12px" }}>
            {spec.filePath}
          </p>
          {spec.rules.map((rule) => (
            <SpecCard
              key={rule.id || rule.title}
              rule={rule}
              spec={spec.spec}
              trace={spec._trace}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
