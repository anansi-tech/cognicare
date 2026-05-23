// One neutral container used by ClientInsights and SessionAIInsights when they
// render stacked agent outputs. Heading, optional summary in a muted box, then
// children (the AgentReportBody dispatched payload).
export function Section({ title, summary, children }) {
  return (
    <section className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-800 mb-3">{title}</h3>
      {summary && (
        <p className="mb-4 rounded-md bg-muted px-3 py-2 text-sm text-foreground/80 leading-relaxed">
          {summary}
        </p>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
