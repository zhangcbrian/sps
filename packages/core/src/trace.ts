import type {
  TraceBlock,
  SubmissionContext,
  TraceHistoryEntry,
} from "./types.js";

export function buildTrace(
  context: SubmissionContext,
  model: string
): TraceBlock {
  const now = new Date().toISOString();
  return {
    requested_by: context.submittedBy,
    requested_at: now,
    original_text: context.text,
    interpretation_model: model,
    interpretation_at: now,
    reviewed_by: null,
    reviewed_at: null,
    source: context.source,
    related_specs: [],
    history: [
      {
        action: "created",
        by: context.submittedBy,
        at: now,
      },
    ],
  };
}

export function appendHistory(
  trace: TraceBlock,
  entry: Omit<TraceHistoryEntry, "at">
): TraceBlock {
  return {
    ...trace,
    history: [
      ...trace.history,
      {
        ...entry,
        at: new Date().toISOString(),
      },
    ],
  };
}
