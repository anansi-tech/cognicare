import { getInstrument } from "./instruments";

/**
 * responses: [{ itemId, value }]. Returns { total, severityBand, flags:[{flag,itemId,note}], complete }.
 * Sum scoring only for now (PHQ-9 / GAD-7). Extend when an instrument needs subscales.
 */
export function scoreInstrument(instrumentId, responses) {
  const inst = getInstrument(instrumentId);
  const byItem = new Map(responses.map((r) => [r.itemId, Number(r.value)]));
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
