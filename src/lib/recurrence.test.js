import { describe, it, expect } from "vitest";
import { generateSeriesDates } from "./recurrence.js";

const START = new Date("2024-01-01");

describe("generateSeriesDates", () => {
  it("first date equals start date", () => {
    const dates = generateSeriesDates(START, "weekly", 3);
    expect(dates[0].toISOString()).toBe(START.toISOString());
  });

  it("weekly x 8 → 8 dates, each 7 days apart", () => {
    const dates = generateSeriesDates(START, "weekly", 8);
    expect(dates).toHaveLength(8);
    for (let i = 1; i < dates.length; i++) {
      const diff = (dates[i] - dates[i - 1]) / 86_400_000;
      expect(diff).toBe(7);
    }
  });

  it("biweekly x 4 → 4 dates, each 14 days apart", () => {
    const dates = generateSeriesDates(START, "biweekly", 4);
    expect(dates).toHaveLength(4);
    for (let i = 1; i < dates.length; i++) {
      const diff = (dates[i] - dates[i - 1]) / 86_400_000;
      expect(diff).toBe(14);
    }
  });

  it("occurrences 0 → clamped to 1", () => {
    expect(generateSeriesDates(START, "weekly", 0)).toHaveLength(1);
  });

  it("negative occurrences → clamped to 1", () => {
    expect(generateSeriesDates(START, "weekly", -5)).toHaveLength(1);
  });

  it("occurrences 999 → clamped to 26", () => {
    expect(generateSeriesDates(START, "weekly", 999)).toHaveLength(26);
  });
});
