import { NextResponse } from "next/server";
import { submitRequirement } from "@specflow/core";

function getRepoRoot(): string {
  return process.env.SPS_REPO || process.cwd();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, mode } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "text is required" },
        { status: 400 }
      );
    }

    const result = await submitRequirement(getRepoRoot(), {
      text,
      submittedBy: "portal-user@sps.dev", // TODO: from auth
      source: "portal",
      mode: mode || "quick",
    });

    return NextResponse.json({
      filePath: result.filePath,
      branch: result.branch,
      ruleCount: result.ruleCount,
      deduplication: {
        matchCount: result.deduplication.matches.length,
        matches: result.deduplication.matches.map((m) => ({
          existingId: m.existingRule.id,
          relationship: m.relationship,
          explanation: m.explanation,
        })),
      },
    });
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 }
    );
  }
}
