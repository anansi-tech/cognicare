export function Spinner({ size = 40, white = false, className = "" }) {
  const t = Math.max(2, Math.round(size / 8));
  const gradient = white
    ? "conic-gradient(from 90deg, rgba(255,255,255,0) 8%, rgba(255,255,255,.6) 55%, #fff 92%)"
    : "conic-gradient(from 90deg, rgba(47,128,255,0) 8%, #25B9C8 55%, #2F80FF 92%)";
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: gradient,
        WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${t}px), #000 calc(100% - ${t}px))`,
        mask: `radial-gradient(farthest-side, transparent calc(100% - ${t}px), #000 calc(100% - ${t}px))`,
      }}
    />
  );
}
