// Two-color CogniCare wordmark — Cogni navy + Care teal. Inline hex on
// purpose: the brand colors don't shift with theme. Single source of truth
// so every wordmark in the app stays consistent.
//
// Usage:
//   <Brand />                          // default size (text-xl font-bold)
//   <Brand className="text-6xl" />     // landing hero — override size
//   <Brand variant="onPrimary" />      // for use on bright-blue Navbar
//                                      // (both halves become white)
export function Brand({ className = "text-xl font-bold", variant }) {
  const onPrimary = variant === "onPrimary";
  const cogni = onPrimary ? "#FFFFFF" : "#0B2B6B";
  const care = onPrimary ? "#FFFFFF" : "#158A98";
  return (
    <span className={className}>
      <span style={{ color: cogni }}>Cogni</span>
      <span style={{ color: care }}>Care</span>
    </span>
  );
}
