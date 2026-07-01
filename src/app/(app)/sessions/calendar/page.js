import CalendarView from "@/app/components/sessions/CalendarView";
import Link from "next/link";

export default function CalendarPage() {
  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: ".12em", color: "#2F80FF", textTransform: "uppercase", margin: 0 }}>
            Sessions
          </p>
          <h1 style={{ fontFamily: "var(--font-bricolage, sans-serif)", fontWeight: 700, fontSize: 34, letterSpacing: "-.025em", margin: "7px 0 0", color: "#0B2B6B" }}>
            Calendar
          </h1>
        </div>
        <Link
          href="/sessions/new"
          className="inline-flex items-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          New session
        </Link>
      </div>
      <div style={{ background: "#fff", border: "1px solid #E3ECF7", borderRadius: 20, overflow: "hidden", boxShadow: "0 22px 50px -40px rgba(11,43,107,.35)" }}>
        <CalendarView />
      </div>
    </div>
  );
}
