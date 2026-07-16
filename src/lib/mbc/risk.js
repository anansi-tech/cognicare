// Pure risk-summary logic for the C-SSRS surfacing rules (Round 55).
// Content-anchored, never time-based: the PHQ-9 item-9 trigger clears only
// when a C-SSRS administration exists AFTER that PHQ-9; the elevated banner
// clears only when a NEWER C-SSRS administration lowers the tier.

export const ELEVATED_TIERS = new Set(["moderate", "high"]);

/**
 * phq9Latest:  { administeredAt, flags } | null  (flags decrypted)
 * cssrsLatest: { administeredAt, tier } | null
 * safetyPlan:  { reviewedAt, updatedAt } | null
 */
export function computeRiskSummary({ phq9Latest, cssrsLatest, safetyPlan }) {
  const item9Positive =
    !!phq9Latest?.flags?.some((f) => f.flag === "phq9-item9-positive");
  const cssrsAfterTrigger =
    item9Positive && !!cssrsLatest &&
    new Date(cssrsLatest.administeredAt) > new Date(phq9Latest.administeredAt);

  return {
    // "Consider administering the C-SSRS" — active until a later C-SSRS exists.
    cssrsSuggested: item9Positive && !cssrsAfterTrigger,
    phq9Date: item9Positive ? phq9Latest.administeredAt : null,
    // Elevated risk — the LATEST administration's tier decides; a newer
    // lower-tier administration clears it, time never does.
    elevated: !!cssrsLatest && ELEVATED_TIERS.has(cssrsLatest.tier),
    cssrs: cssrsLatest
      ? { tier: cssrsLatest.tier, date: cssrsLatest.administeredAt }
      : null,
    safetyPlan: {
      exists: !!safetyPlan,
      reviewedAt: safetyPlan?.reviewedAt ?? null,
      updatedAt: safetyPlan?.updatedAt ?? null,
    },
  };
}
