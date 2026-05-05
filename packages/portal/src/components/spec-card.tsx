import type { SpecRule, TraceBlock, CategoryConfig } from "@specflow/core";

interface SpecCardProps {
  rule: SpecRule;
  spec: string;
  trace?: TraceBlock;
  categories?: CategoryConfig[];
}

const statusColors: Record<string, string> = {
  active: "#00E5A0",
  proposed: "#F5A623",
  deprecated: "#666",
};

export function SpecCard({
  rule,
  spec,
  trace,
  categories,
}: SpecCardProps) {
  const cat = categories?.find((c) => c.id === rule.category);

  return (
    <div
      style={{
        border: `1px solid ${cat ? cat.color + "33" : "#333"}`,
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "12px",
        backgroundColor: "#111",
        borderLeft: cat ? `3px solid ${cat.color}` : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span
            style={{
              color: "#999",
              fontSize: "13px",
              fontFamily: "monospace",
            }}
          >
            {rule.id || spec}
          </span>
          {cat && (
            <span
              style={{
                backgroundColor: cat.color + "20",
                color: cat.color,
                fontSize: "11px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {cat.label}
            </span>
          )}
        </div>
        <span
          style={{
            color: statusColors[rule.status] || "#999",
            fontSize: "12px",
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          {rule.status}
        </span>
      </div>

      <h3 style={{ margin: "0 0 4px 0", fontSize: "16px" }}>
        {rule.title}
      </h3>

      {rule.given && (
        <div style={{ marginBottom: "8px" }}>
          <span
            style={{ color: "#00E5A0", fontWeight: 600, fontSize: "13px" }}
          >
            Given:{" "}
          </span>
          <span style={{ color: "#ccc", fontSize: "14px" }}>{rule.given}</span>
        </div>
      )}
      {rule.when && (
        <div style={{ marginBottom: "8px" }}>
          <span
            style={{ color: "#F5A623", fontWeight: 600, fontSize: "13px" }}
          >
            When:{" "}
          </span>
          <span style={{ color: "#ccc", fontSize: "14px" }}>{rule.when}</span>
        </div>
      )}
      {rule.then && (
        <div style={{ marginBottom: "8px" }}>
          <span
            style={{ color: "#4B9EFF", fontWeight: 600, fontSize: "13px" }}
          >
            Then:{" "}
          </span>
          <span style={{ color: "#ccc", fontSize: "14px" }}>{rule.then}</span>
        </div>
      )}

      {rule.edge_cases && rule.edge_cases.length > 0 && (
        <div
          style={{
            marginTop: "12px",
            paddingTop: "8px",
            borderTop: "1px solid #222",
          }}
        >
          {rule.edge_cases.map((ec, i) => (
            <div
              key={i}
              style={{ color: "#888", fontSize: "13px", marginBottom: "4px" }}
            >
              <span style={{ color: "#FF4B4B" }}>Edge:</span> {ec.case} —{" "}
              {ec.decision}
            </div>
          ))}
        </div>
      )}

      {trace && (
        <div
          style={{
            marginTop: "12px",
            paddingTop: "8px",
            borderTop: "1px solid #222",
            color: "#666",
            fontSize: "12px",
          }}
        >
          Requested by {trace.requested_by} via {trace.source} on{" "}
          {new Date(trace.requested_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}
