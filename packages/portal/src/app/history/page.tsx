import { loadSpecs } from "@sps/core";

function getRepoRoot(): string {
  return process.env.SPS_REPO || process.cwd();
}

export default async function HistoryPage() {
  const repoRoot = getRepoRoot();
  const specs = loadSpecs(repoRoot);

  // Collect all traced specs with timestamps
  const traced = specs
    .filter((s) => s._trace)
    .sort(
      (a, b) =>
        new Date(b._trace!.requested_at).getTime() -
        new Date(a._trace!.requested_at).getTime()
    );

  return (
    <div>
      <h1>Submission History</h1>
      <p style={{ color: "#999", marginBottom: "24px" }}>
        {traced.length} traced submission(s)
      </p>

      {traced.map((spec) => (
        <div
          key={spec.filePath}
          style={{
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "12px",
            backgroundColor: "#111",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
            }}
          >
            <strong>
              {spec.spec}
            </strong>
            <span style={{ color: "#666", fontSize: "13px" }}>
              {new Date(spec._trace!.requested_at).toLocaleString()}
            </span>
          </div>
          <div style={{ color: "#999", fontSize: "14px", marginBottom: "8px" }}>
            {spec._trace!.original_text.slice(0, 200)}
            {spec._trace!.original_text.length > 200 ? "..." : ""}
          </div>
          <div style={{ color: "#666", fontSize: "12px" }}>
            By {spec._trace!.requested_by} via {spec._trace!.source} |{" "}
            {spec.rules.length} rule(s) | Model: {spec._trace!.interpretation_model}
          </div>
        </div>
      ))}

      {traced.length === 0 && (
        <p style={{ color: "#666", textAlign: "center", padding: "48px" }}>
          No traced submissions yet. Specs created via the portal or CLI will
          appear here.
        </p>
      )}
    </div>
  );
}
