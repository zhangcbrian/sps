"use client";

import { useState } from "react";

export default function SubmitPage() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"quick" | "guided">("quick");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<{
    filePath: string;
    branch: string;
    ruleCount: number;
  } | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), mode }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to submit");
      }

      const data = await res.json();
      setResult(data);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }

  return (
    <div style={{ maxWidth: "700px" }}>
      <h1>Submit a Requirement</h1>
      <p style={{ color: "#999", marginBottom: "24px" }}>
        Describe the feature you need in plain English. The system will
        interpret it into structured specs.
      </p>

      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="We need to let users apply discount codes at checkout. Should work with percentage and fixed-amount coupons. One coupon per order max."
          style={{
            width: "100%",
            minHeight: "150px",
            padding: "16px",
            backgroundColor: "#111",
            border: "1px solid #333",
            borderRadius: "8px",
            color: "#fafaf9",
            fontSize: "15px",
            fontFamily: "inherit",
            resize: "vertical",
          }}
          disabled={status === "loading"}
        />

        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "16px",
            alignItems: "center",
          }}
        >
          <label style={{ display: "flex", gap: "6px", cursor: "pointer" }}>
            <input
              type="radio"
              checked={mode === "quick"}
              onChange={() => setMode("quick")}
            />
            Quick mode
          </label>
          <label style={{ display: "flex", gap: "6px", cursor: "pointer" }}>
            <input
              type="radio"
              checked={mode === "guided"}
              onChange={() => setMode("guided")}
            />
            Guided mode
          </label>

          <button
            type="submit"
            disabled={!text.trim() || status === "loading"}
            style={{
              marginLeft: "auto",
              padding: "10px 24px",
              backgroundColor: status === "loading" ? "#333" : "#00E5A0",
              color: "#0a0a0b",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: status === "loading" ? "wait" : "pointer",
              fontSize: "14px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {status === "loading" ? "Interpreting..." : "Submit"}
          </button>
        </div>
      </form>

      {status === "success" && result && (
        <div
          style={{
            marginTop: "24px",
            padding: "16px",
            backgroundColor: "#0a2a1a",
            border: "1px solid #00E5A0",
            borderRadius: "8px",
          }}
        >
          <h3 style={{ color: "#00E5A0", margin: "0 0 8px 0" }}>
            Spec created successfully
          </h3>
          <p style={{ margin: "4px 0", color: "#ccc" }}>
            File: <code>{result.filePath}</code>
          </p>
          <p style={{ margin: "4px 0", color: "#ccc" }}>
            Branch: <code>{result.branch}</code>
          </p>
          <p style={{ margin: "4px 0", color: "#ccc" }}>
            Rules: {result.ruleCount}
          </p>
        </div>
      )}

      {status === "error" && (
        <div
          style={{
            marginTop: "24px",
            padding: "16px",
            backgroundColor: "#2a0a0a",
            border: "1px solid #FF4B4B",
            borderRadius: "8px",
            color: "#FF4B4B",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
