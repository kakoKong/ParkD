import type { ZoneLevel } from "@/types/map";

const ZONE_COLORS: Record<string, string> = {
  recommended: "#22c55e",
  neutral: "#94a3b8",
  caution: "#f97316",
  avoid: "#ef4444"
};

export function getZoneColor(level: ZoneLevel): string {
  const key = typeof level === "string" ? level.toLowerCase() : "";
  return ZONE_COLORS[key] ?? "#94a3b8";
}

