import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export function MeasureResult({ instrument, result }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-semibold">{result.total}</span>
        <span className="text-sm text-muted-foreground">/ {instrument.scoring.max}</span>
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
