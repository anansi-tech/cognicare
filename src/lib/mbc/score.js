import { getInstrument } from "./instruments";

const TIER_RANK = { none: 0, low: 1, moderate: 2, high: 3 };
const TIER_LABEL = {
  none: "No items endorsed",
  low: "Low risk tier",
  moderate: "Moderate risk tier",
  high: "High risk tier",
};

/** Display condition: an item with `showIf` is only asked when a prior answer meets it. */
export function isItemVisible(item, byItem) {
  if (!item.showIf) return true;
  return (byItem.get(item.showIf.itemId) ?? 0) >= item.showIf.gte;
}

/**
 * Categorical result for a branching screener (C-SSRS): no total — the tier is
 * the highest `tierIfYes` among endorsed visible items, per the instrument's
 * triage guidance encoded in the JSON. Returns { tier, positives }.
 */
export function categorize(instrumentId, responses) {
  const inst = getInstrument(instrumentId);
  const byItem = new Map(responses.map((r) => [r.itemId, Number(r.value)]));
  let tier = "none";
  const positives = [];
  for (const it of inst.items) {
    if (!isItemVisible(it, byItem)) continue;
    if ((byItem.get(it.id) ?? 0) >= 1) {
      positives.push(it.id);
      if (TIER_RANK[it.tierIfYes] > TIER_RANK[tier]) tier = it.tierIfYes;
    }
  }
  return { tier, positives };
}

/**
 * responses: [{ itemId, value }]. Summed instruments return
 * { total, severityBand, flags, complete }; categorical instruments return
 * { tier, positives, severityBand, flags, complete } with total null.
 */
export function scoreInstrument(instrumentId, responses) {
  const inst = getInstrument(instrumentId);
  const byItem = new Map(responses.map((r) => [r.itemId, Number(r.value)]));

  if (inst.scoring?.method === "categorical") {
    const visible = inst.items.filter((it) => isItemVisible(it, byItem));
    const complete = visible.every((it) => byItem.has(it.id));
    const { tier, positives } = categorize(instrumentId, responses);
    return { total: null, tier, positives, severityBand: TIER_LABEL[tier], flags: [], complete };
  }

  const complete = inst.items.every((it) => byItem.has(it.id));
  const total = inst.items.reduce((s, it) => s + (byItem.get(it.id) ?? 0), 0);

  const band = inst.bands.find((b) => total >= b.min && total <= b.max);
  const flags = [];
  for (const c of inst.criticalItems ?? []) {
    if ((byItem.get(c.itemId) ?? 0) >= c.threshold) {
      flags.push({ flag: c.flag, itemId: c.itemId, note: c.note });
    }
  }
  return { total, severityBand: band?.label ?? "Unknown", flags, complete };
}
