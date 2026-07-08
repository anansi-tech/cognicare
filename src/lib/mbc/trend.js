import { connectDB } from "@/lib/mongodb";
import MeasureAdministration from "@/models/measureAdministration";
import { getInstrument } from "./instruments";

/** Pure direction logic, exported for tests. */
export function computeDirection(delta, inst) {
  if (delta == null) return "insufficient-data";
  if (delta === 0) return "unchanged";
  const isWellbeing = inst.direction === "wellbeing";
  return isWellbeing
    ? (delta > 0 ? "improved" : "worsened")
    : (delta < 0 ? "improved" : "worsened");
}

/** Oldest -> newest series for an instrument, plus reliable-change vs the prior point. */
export async function getTrend(clientId, instrumentId, limit = 6) {
  await connectDB();
  const docs = await MeasureAdministration.find({ clientId, instrumentId })
    .sort({ administeredAt: -1 }).limit(limit);
  docs.reverse();
  if (docs.length === 0) return { instrumentId, points: [], direction: "insufficient-data" };

  const inst = getInstrument(instrumentId);
  const points = docs.map((d) => ({
    date: d.administeredAt, total: d.total, band: d.severityBand, flags: d.flags ?? [],
    isBaseline: d.isBaseline ?? false,
  }));
  const latest = points.at(-1).total;
  const prev = points.length > 1 ? points.at(-2).total : null;
  const delta = prev == null ? null : latest - prev;
  const reliableChange = delta == null ? false : Math.abs(delta) >= inst.reliableChange;
  const direction = computeDirection(delta, inst);

  return {
    instrumentId, name: inst.name, shortName: inst.shortName,
    percentageFactor: inst.scoring?.percentageFactor ?? null,
    scoringMax: inst.scoring.max,
    points, latest, previous: prev, delta, reliableChange, direction,
  };
}
