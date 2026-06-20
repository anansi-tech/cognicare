import phq9 from "@/data/instruments/phq9.json";
import gad7 from "@/data/instruments/gad7.json";
import who5 from "@/data/instruments/who5.json";

const REGISTRY = { phq9, gad7, who5 };

export function getInstrument(id) {
  const i = REGISTRY[id];
  if (!i) throw new Error(`Unknown instrument: ${id}`);
  return i;
}
export function listInstruments() {
  return Object.values(REGISTRY).map(({ id, name, construct }) => ({ id, name, construct }));
}
