import { getCurrentUser } from "@/lib/auth";
import { streamLiam } from "@/lib/ai/liam/agent";
import { getThread, appendExchange } from "@/lib/ai/liam/memory";

export const runtime = "nodejs"; // Mongoose + fs prompt loader — not edge.

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { clientId, messages } = await req.json();
  if (!clientId || !messages?.length) return new Response("clientId and messages required", { status: 400 });

  const thread = await getThread(user.id, clientId);
  const result = await streamLiam({ clientId, thread, uiMessages: messages });

  // last user message text (parts-based UI message)
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userText = (lastUser?.parts ?? [])
    .filter((p) => p.type === "text").map((p) => p.text).join("") || lastUser?.content || "";

  return result.toUIMessageStreamResponse({
    onFinish: async ({ text }) => {
      try { await appendExchange(thread, userText, text); }
      catch (e) { console.error("LIAM memory persist failed", e); }
    },
  });
}
