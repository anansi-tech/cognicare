const AVATAR_COLORS = [
  ["#EAF3FF", "#2F80FF"],
  ["#E2F4F2", "#158A98"],
  ["#E7F6EC", "#3B9E57"],
  ["#FBF2DA", "#A9821F"],
  ["#F0EAFB", "#7C5CBF"],
];

export function avatarColors(name = "") {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export function initials(name = "") {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}
