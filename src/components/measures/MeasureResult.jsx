import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const TIER_STYLE = {
  none: { bg: "#E7F6EC", color: "#3B9E57" },
  low: { bg: "#FBF2DA", color: "#A9821F" },
  moderate: { bg: "#FDECEC", color: "#C0392B" },
  high: { bg: "#FDECEC", color: "#C0392B" },
};

export function MeasureResult({ instrument, result }) {
  // Categorical screener (C-SSRS): a tier, never a score.
  if (result.tier) {
    const s = TIER_STYLE[result.tier] ?? TIER_STYLE.none;
    const elevated = result.tier === "moderate" || result.tier === "high";
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 12.5, fontWeight: 700, padding: "4px 13px", borderRadius: 999, background: s.bg, color: s.color }}>
            {result.severityBand}
          </span>
        </div>
        {elevated && (
          <Alert variant="destructive">
            <AlertTitle>Screener indicates elevated risk — clinical judgment required.</AlertTitle>
            <AlertDescription>
              Review or create the client&apos;s safety plan from their Overview.
            </AlertDescription>
          </Alert>
        )}
        {instrument.attribution && (
          <p className="text-xs text-muted-foreground">{instrument.attribution}</p>
        )}
        <p className="text-xs text-muted-foreground">Saved.</p>
      </div>
    );
  }

  const pct = instrument.scoring?.percentageFactor
    ? result.total * instrument.scoring.percentageFactor
    : null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-semibold">{result.total}</span>
        <span className="text-sm text-muted-foreground">
          / {instrument.scoring.max}{pct != null ? ` (${pct}%)` : ""}
        </span>
        <Badge variant="secondary">{result.severityBand}</Badge>
      </div>
      {result.flags?.some((f) => f.flag === "suicidal-ideation") && (
        <Alert variant="destructive">
          <AlertTitle>Safety item endorsed</AlertTitle>
          <AlertDescription>
            This response set includes a non-zero answer on the self-harm item. Consider a safety
            review with the client before the session ends.
          </AlertDescription>
        </Alert>
      )}
      <p className="text-xs text-muted-foreground">Saved. The trend updates below.</p>
    </div>
  );
}
