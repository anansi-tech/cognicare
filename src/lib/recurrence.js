// Pure: given a start date + frequency + count, return the array of dates. Caps at 26.
export function generateSeriesDates(startDate, frequency, occurrences) {
  const step = frequency === "biweekly" ? 14 : 7;
  const count = Math.min(Math.max(parseInt(occurrences) || 1, 1), 26);
  const start = new Date(startDate);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i * step);
    return d;
  });
}
