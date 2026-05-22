import { readFile } from "node:fs/promises";
import path from "node:path";

const cache = new Map();

// Node runtime only (specialists run on Node). LIAM/edge handles prompts differently in Round 2.
export async function loadPrompt(name) {
  if (cache.has(name)) return cache.get(name);
  const file = path.join(process.cwd(), "prompts", `${name}.md`);
  const text = await readFile(file, "utf8");
  cache.set(name, text);
  return text;
}
