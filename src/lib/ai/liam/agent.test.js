import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  streamText: vi.fn(),
  openai: vi.fn(() => "clinical-model"),
  loadPrompt: vi.fn(),
  buildClientBlock: vi.fn(),
  buildMemoryBlock: vi.fn(),
}));

vi.mock("ai", () => ({ streamText: mocks.streamText }));
vi.mock("@/lib/ai/client", () => ({
  openai: mocks.openai,
  MODELS: { clinical: "gpt-clinical" },
}));
vi.mock("@/lib/ai/prompts", () => ({ loadPrompt: mocks.loadPrompt }));
vi.mock("@/lib/ai/context", () => ({ buildClientBlock: mocks.buildClientBlock }));
vi.mock("./memory", () => ({ buildMemoryBlock: mocks.buildMemoryBlock }));

import { streamLiam } from "./agent.js";

describe("streamLiam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadPrompt.mockResolvedValue("PROMPT");
    mocks.buildClientBlock.mockResolvedValue("CLIENT");
    mocks.buildMemoryBlock.mockReturnValue("MEMORY");
    mocks.streamText.mockReturnValue({ stream: true });
  });

  it("sends one current question with server memory and disables response storage", async () => {
    const onFinish = vi.fn();
    const thread = { turns: [{ role: "assistant", content: "Prior answer" }] };

    await streamLiam({
      clientId: "client-1",
      thread,
      userText: "Current question",
      onFinish,
    });

    expect(mocks.streamText).toHaveBeenCalledWith({
      model: "clinical-model",
      system: "PROMPT\n\nCLIENT\n\nMEMORY",
      messages: [{ role: "user", content: "Current question" }],
      providerOptions: { openai: { store: false } },
      onFinish,
    });
  });
});
