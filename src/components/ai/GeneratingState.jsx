// Calm, single-line "agent is working" indicator. Use everywhere an agent is running
// so the experience reads as intentional, not a stuck spinner.
export function GeneratingState({ label }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span
        aria-hidden="true"
        className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      <span>{label}</span>
    </div>
  );
}
