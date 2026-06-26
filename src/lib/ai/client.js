// PHI GATE: OpenAI BAA + Zero-Data-Retention must be enabled on the org before real client
// PHI is sent to these models. Until confirmed, use synthetic test clients only.
import { createOpenAI } from "@ai-sdk/openai";

export const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Single source of truth for model selection. Bump here, nowhere else.
export const MODELS = {
  clinical: "gpt-5.5",       // specialists + (Round 2) LIAM
  background: "gpt-5.4-mini", // titles, summaries, digests (later rounds)
};
// COST MODE: nano while iterating. Flip clinical -> "gpt-5.5", background -> "gpt-5.4-mini"
// before real clinical use / quality evaluation.
// export const MODELS = {
//   clinical: "gpt-5.4-nano", // specialists + (Round 2) LIAM
//   background: "gpt-5.4-nano", // titles, summaries, digests (later rounds)
// };
