import { getCurrentUser } from "@/lib/auth";
import { visibleClientIds } from "@/lib/practice";
import { streamLiam } from "@/lib/ai/liam/agent";
import { getThread, appendExchange } from "@/lib/ai/liam/memory";

export const runtime = "nodejs"; // Mongoose + fs prompt loader — not edge.

export async function POST(req) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { clientId, messages } = await req.json();
  if (!clientId || !messages?.length) return new Response("clientId and messages required", { status: 400 });

  const allowed = await visibleClientIds(user);
  if (!allowed.some((id) => id.toString() === String(clientId))) {
    return new Response("Client not found", { status: 404 });
  }

  // The encrypted LiamThread is the single source of conversation history.
  // Browser messages are display state; only the current question goes back to
  // the model, so prior turns are neither duplicated nor replayed as OpenAI
  // response-item references (which are unavailable under ZDR).
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userText = ((lastUser?.parts ?? [])
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("") || lastUser?.content || "").trim();
  if (!userText) return new Response("A user message is required", { status: 400 });

  const thread = await getThread(user.id, clientId);
  const result = await streamLiam({
    clientId,
    thread,
    userText,
    onFinish: async ({ text }) => {
      const assistantText = text?.trim();
      if (!assistantText) return;
      try { await appendExchange(thread, userText, assistantText); }
      catch (e) { console.error("LIAM memory persist failed", e); }
    },
  });

  return result.toUIMessageStreamResponse();
}
