import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  visibleClientIds: vi.fn(),
  getThread: vi.fn(),
  appendExchange: vi.fn(),
  streamLiam: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/practice", () => ({ visibleClientIds: mocks.visibleClientIds }));
vi.mock("@/lib/ai/liam/memory", () => ({
  getThread: mocks.getThread,
  appendExchange: mocks.appendExchange,
}));
vi.mock("@/lib/ai/liam/agent", () => ({ streamLiam: mocks.streamLiam }));

import { POST } from "./route.js";

const CLIENT_ID = "6a4db9e2e80c629589d731d6";
const request = (body) => ({ json: vi.fn().mockResolvedValue(body) });

describe("POST /api/liam/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", practiceId: "practice-1" });
    mocks.visibleClientIds.mockResolvedValue([CLIENT_ID]);
    mocks.getThread.mockResolvedValue({ turns: [] });
  });

  it("rejects a client outside the user's visibility before loading PHI", async () => {
    mocks.visibleClientIds.mockResolvedValue([]);

    const response = await POST(request({
      clientId: CLIENT_ID,
      messages: [{ role: "user", parts: [{ type: "text", text: "Hello" }] }],
    }));

    expect(response.status).toBe(404);
    expect(mocks.getThread).not.toHaveBeenCalled();
    expect(mocks.streamLiam).not.toHaveBeenCalled();
  });

  it("uses only the latest user text and persists the completed response", async () => {
    const thread = { turns: [] };
    let generationOptions;
    mocks.getThread.mockResolvedValue(thread);
    mocks.streamLiam.mockImplementation(async (options) => {
      generationOptions = options;
      return {
        toUIMessageStreamResponse: () => new Response("stream"),
      };
    });

    const response = await POST(request({
      clientId: CLIENT_ID,
      messages: [
        { role: "user", parts: [{ type: "text", text: "Earlier question" }] },
        {
          role: "assistant",
          parts: [{
            type: "reasoning",
            text: "",
            providerMetadata: { openai: { itemId: "rs_missing" } },
          }],
        },
        { role: "user", parts: [{ type: "text", text: "  Is she suicidal?  " }] },
      ],
    }));

    expect(response.status).toBe(200);
    expect(mocks.streamLiam).toHaveBeenCalledWith(expect.objectContaining({
      clientId: CLIENT_ID,
      thread,
      userText: "Is she suicidal?",
    }));

    await generationOptions.onFinish({ text: "  The record shows a risk flag.  " });
    expect(mocks.appendExchange).toHaveBeenCalledWith(
      thread,
      "Is she suicidal?",
      "The record shows a risk flag."
    );
  });

  it("does not persist an empty generation", async () => {
    let generationOptions;
    mocks.streamLiam.mockImplementation(async (options) => {
      generationOptions = options;
      return { toUIMessageStreamResponse: () => new Response("stream") };
    });

    await POST(request({
      clientId: CLIENT_ID,
      messages: [{ role: "user", parts: [{ type: "text", text: "Question" }] }],
    }));
    await generationOptions.onFinish({ text: "" });

    expect(mocks.appendExchange).not.toHaveBeenCalled();
  });
});
