import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  openai: vi.fn(() => "background-model"),
}));

vi.mock("ai", () => ({ generateText: mocks.generateText }));
vi.mock("@/lib/ai/client", () => ({
  openai: mocks.openai,
  MODELS: { background: "gpt-background" },
}));
vi.mock("@/lib/mongodb", () => ({ connectDB: vi.fn() }));
vi.mock("@/models/liamThread", () => ({ default: {} }));

import { appendExchange, buildMemoryBlock } from "./memory.js";

describe("LIAM server memory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generateText.mockResolvedValue({ text: "Updated summary" });
  });

  it("stores a trimmed, complete exchange", async () => {
    const thread = { turns: [], save: vi.fn() };

    await appendExchange(thread, "  Question  ", "  Answer  ");

    expect(thread.turns).toMatchObject([
      { role: "user", content: "Question" },
      { role: "assistant", content: "Answer" },
    ]);
    expect(thread.save).toHaveBeenCalledOnce();
  });

  it("rejects incomplete exchanges without mutating the thread", async () => {
    const thread = { turns: [], save: vi.fn() };

    await expect(appendExchange(thread, "Question", "  ")).rejects.toThrow(
      "non-empty user and assistant content"
    );
    expect(thread.turns).toEqual([]);
    expect(thread.save).not.toHaveBeenCalled();
  });

  it("summarizes overflow without OpenAI response storage", async () => {
    const turns = Array.from({ length: 12 }, (_, i) => ({
      role: i % 2 ? "assistant" : "user",
      content: `turn-${i}`,
    }));
    const thread = { turns, rollingSummary: "Old summary", save: vi.fn() };

    await appendExchange(thread, "New question", "New answer");

    expect(thread.turns).toHaveLength(12);
    expect(thread.rollingSummary).toBe("Updated summary");
    expect(mocks.generateText).toHaveBeenCalledWith(expect.objectContaining({
      providerOptions: { openai: { store: false } },
    }));
  });

  it("includes each retained turn once in the memory block", () => {
    const thread = {
      rollingSummary: "Earlier context",
      turns: [
        { role: "user", content: "Question" },
        { role: "assistant", content: "Answer" },
      ],
    };

    const block = buildMemoryBlock(thread);
    expect(block.match(/Therapist: Question/g)).toHaveLength(1);
    expect(block.match(/LIAM: Answer/g)).toHaveLength(1);
  });
});
