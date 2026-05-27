// Honest 6-agent pipeline visual (Round 19). Replaces the decorative
// animated SVG that listed an old "Conversational Agent" name and had no
// real meaning. Shows how the agents actually flow: five specialists chained
// sequentially, plus LIAM alongside as the in-session copilot. Token-only
// styling so it inherits the Option C palette.
import { Fragment } from "react";

const STAGES = [
  {
    key: "assessment",
    name: "Assessment",
    caption: "Structured intake & risk",
  },
  {
    key: "diagnostic",
    name: "Diagnostic",
    caption: "DSM-5 differential",
  },
  {
    key: "treatment",
    name: "Treatment",
    caption: "Evidence-based plan",
  },
  {
    key: "progress",
    name: "Progress",
    caption: "Measurement-based tracking",
  },
  {
    key: "documentation",
    name: "Documentation",
    caption: "SOAP notes you approve",
  },
];

export default function AgentPipeline() {
  return (
    <div className="rounded-3xl border border-border bg-white p-6 sm:p-10 shadow-sm">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-wider text-primary font-semibold">
          How CogniCare works
        </p>
        <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-foreground">
          Five specialists, one workflow
        </h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl mx-auto">
          Each agent feeds the next — intake becomes assessment, assessment becomes
          a treatment plan, sessions become progress notes you review and approve.
        </p>
      </div>

      {/* Pipeline: horizontal on desktop, vertical on mobile. Cards are
          flex-1 (all equal width); arrows are separate flex items so they
          don't steal width from the card next to them. */}
      <ol
        role="list"
        className="flex flex-col md:flex-row md:items-stretch gap-3 md:gap-2"
      >
        {STAGES.map((stage, i) => (
          <Fragment key={stage.key}>
            <li className="flex-1 rounded-xl border border-border bg-secondary px-4 py-3 hover:border-primary/40 transition-colors min-h-[88px] md:min-h-[110px] flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  {i + 1}
                </span>
                <p className="text-sm font-semibold text-foreground">{stage.name}</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-snug">
                {stage.caption}
              </p>
            </li>
            {i < STAGES.length - 1 && (
              <li
                aria-hidden="true"
                className="flex md:items-center justify-center flex-shrink-0"
              >
                <Arrow className="text-muted-foreground" />
              </li>
            )}
          </Fragment>
        ))}
      </ol>

      {/* LIAM — distinct teal node connected to the whole pipeline */}
      <div className="mt-8 grid md:grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="hidden md:block h-px bg-border" />
        <div className="rounded-xl border border-accent/60 bg-accent/15 px-5 py-4 text-center md:text-left flex items-start gap-3">
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-accent text-accent-foreground text-xs font-bold flex-shrink-0">
            L
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">LIAM</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              In-session copilot — answers from this client&apos;s entire record,
              alongside the pipeline.
            </p>
          </div>
        </div>
        <div className="hidden md:block h-px bg-border" />
      </div>
    </div>
  );
}

// Right-arrow on desktop, down-arrow on mobile, both rendered with the same
// SVG via responsive rotation — keeps the markup simple.
function Arrow({ className = "" }) {
  return (
    <svg
      className={`w-6 h-6 md:w-5 md:h-5 rotate-90 md:rotate-0 flex-shrink-0 ${className}`}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 10h12m0 0l-4-4m4 4l-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
