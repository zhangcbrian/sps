import { describe, it, expect } from "vitest";
import { resolveModelId } from "../src/llm.js";
import { DEFAULT_CONFIG } from "../src/config.js";

describe("resolveModelId", () => {
  it("returns gateway-style models unchanged", () => {
    expect(
      resolveModelId({
        ...DEFAULT_CONFIG,
        llm: { model: "anthropic/claude-opus-4-7" },
      })
    ).toBe("anthropic/claude-opus-4-7");
  });

  it("composes legacy provider + bare model name", () => {
    expect(
      resolveModelId({
        ...DEFAULT_CONFIG,
        llm: { provider: "openai", model: "gpt-5" },
      })
    ).toBe("openai/gpt-5");
  });

  it("returns bare model when no provider is configured", () => {
    expect(
      resolveModelId({
        ...DEFAULT_CONFIG,
        llm: { model: "lonely-model" },
      })
    ).toBe("lonely-model");
  });

  it("default config resolves to anthropic/claude-opus-4-7", () => {
    expect(resolveModelId(DEFAULT_CONFIG)).toBe("anthropic/claude-opus-4-7");
  });
});
