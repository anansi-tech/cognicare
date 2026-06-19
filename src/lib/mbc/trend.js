import { connectDB } from "@/lib/mongodb";
import MeasureAdministration from "@/models/measureAdministration";
import { getInstrument } from "./instruments";

/** Oldest -> newest series for an instrument, plus reliable-change vs the prior point. */
export async function getTrend(clientId, instrumentId, limit = 6) {
  await connectDB();
  const docs = await MeasureAdministration.find({ clientId, instrumentId })
    .sort({ administeredAt: -1 }).limit(limit).lean();
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
  const direction = delta == null ? "insufficient-data"
    : delta < 0 ? "improved" : delta > 0 ? "worsened" : "unchanged";

  return { instrumentId, name: inst.name, points, latest, previous: prev, delta, reliableChange, direction };
}
