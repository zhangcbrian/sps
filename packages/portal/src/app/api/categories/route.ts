import { NextResponse } from "next/server";
import { loadConfig } from "@specflow/core";

function getRepoRoot(): string {
  return process.env.SPECFLOW_REPO || process.cwd();
}

export async function GET() {
  const config = loadConfig(getRepoRoot());
  return NextResponse.json({ categories: config.categories });
}
