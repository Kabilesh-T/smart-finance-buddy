"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PRESETS: { label: string; days: number | null }[] = [
  { label: "All", days: null },
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return isoDate(d);
}

function detectActive(from: string | null, to: string | null): number | null | "custom" {
  if (!from || !to) return null;
  if (to !== isoDate(new Date())) return "custom";
  const diff = Math.round((new Date(to).getTime() - new Date(from).getTime()) / MS_PER_DAY);
  return PRESETS.find((p) => p.days === diff)?.days ?? "custom";
}

export default function DateRangeFilter({
  from,
  to,
}: {
  from: string | null;
  to: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = detectActive(from, to);
  const [showCustom, setShowCustom] = useState(active === "custom");
  const [customFrom, setCustomFrom] = useState(from ?? daysAgo(30));
  const [customTo, setCustomTo] = useState(to ?? isoDate(new Date()));
  const [error, setError] = useState<string | null>(null);

  function pushParams(next: { from?: string | null; to?: string | null }) {
    const params = new URLSearchParams(searchParams);
    if (next.from == null) params.delete("from");
    else params.set("from", next.from);
    if (next.to == null) params.delete("to");
    else params.set("to", next.to);
    // Always clear `month` when changing date range — they're alternative filters.
    params.delete("month");
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  }

  function applyPreset(days: number | null) {
    setShowCustom(false);
    setError(null);
    if (days === null) pushParams({ from: null, to: null });
    else pushParams({ from: daysAgo(days), to: isoDate(new Date()) });
  }

  function applyCustom() {
    if (!customFrom || !customTo) {
      setError("Pick both start and end dates");
      return;
    }
    const f = new Date(customFrom);
    const t = new Date(customTo);
    if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) {
      setError("Invalid date");
      return;
    }
    if (f > t) {
      setError("Start must be before end");
      return;
    }
    const diff = (t.getTime() - f.getTime()) / MS_PER_DAY;
    if (diff > 90) {
      setError("Range cannot exceed 90 days");
      return;
    }
    setError(null);
    pushParams({ from: customFrom, to: customTo });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-0.5 p-1 bg-card border border-border rounded-lg">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => applyPreset(p.days)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              active === p.days
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom((s) => !s)}
          className={cn(
            "px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5",
            active === "custom" || showCustom
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Calendar className="w-3 h-3" />
          Custom
        </button>
      </div>

      {(from || to) && (
        <button
          onClick={() => applyPreset(null)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}

      {showCustom && (
        <div className="flex items-center gap-2 ml-1">
          <input
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="bg-card border border-border rounded-md px-2 py-1 text-xs h-7"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <input
            type="date"
            value={customTo}
            min={customFrom || undefined}
            max={isoDate(new Date())}
            onChange={(e) => setCustomTo(e.target.value)}
            className="bg-card border border-border rounded-md px-2 py-1 text-xs h-7"
          />
          <Button size="sm" onClick={applyCustom}>
            Apply
          </Button>
        </div>
      )}

      {error && <div className="text-xs text-destructive ml-1">{error}</div>}
    </div>
  );
}
