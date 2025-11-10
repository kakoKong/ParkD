"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { PricingBreakdown } from "@/types/parking";

export type ParkingSearchConfig = {
  durationMinutes: number;
};

interface ParkingSearchFormProps {
  onResults: (results: PricingBreakdown[]) => void;
  variant?: "default" | "compact";
  language?: "en" | "th";
  config?: ParkingSearchConfig;
  onConfigChange?: (config: ParkingSearchConfig) => void;
}

type DurationOption = {
  label: string;
  minutes: number;
};

function formatDuration(minutes: number, language: "en" | "th") {
  if (minutes <= 0) return language === "th" ? "ตั้งค่าระยะเวลา" : "Set duration";
  if (minutes < 60) {
    return language === "th" ? `${minutes} นาที` : `${minutes} min`;
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    if (language === "th") {
      return `${hours.toString()} ชม.`;
    }
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }
  if (language === "th") {
    return `${(minutes / 60).toFixed(1)} ชม.`;
  }
  return `${(minutes / 60).toFixed(1)} hrs`;
}

export function ParkingSearchForm({
  onResults,
  variant = "default",
  language = "en",
  config,
  onConfigChange
}: ParkingSearchFormProps) {
  const isThai = language === "th";
  const baseDurations = useMemo(() => [30, 60, 120, 180, 240, 300], []);
  const durationOptions = useMemo<DurationOption[]>(
    () =>
      baseDurations.map((minutes) => ({
        minutes,
        label:
          minutes < 60
            ? isThai
              ? `${minutes} นาที`
              : `${minutes} min`
            : isThai
            ? `${minutes / 60} ชม.`
            : `${minutes / 60} hr`
      })),
    [baseDurations, isThai]
  );

  const defaultDuration = durationOptions[2]?.minutes ?? 120;
  const initialDuration = useMemo(() => {
    const candidate =
      typeof config?.durationMinutes === "number" ? config.durationMinutes : defaultDuration;
    return baseDurations.includes(candidate) ? candidate : defaultDuration;
  }, [baseDurations, config?.durationMinutes, defaultDuration]);
  const [durationMinutes, setDurationMinutes] = useState<number>(initialDuration);
  const isSyncingFromConfigRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!config) return;
    const candidate =
      typeof config.durationMinutes === "number"
        ? config.durationMinutes
        : durationOptions[2]?.minutes ?? defaultDuration;
    const nextDuration = baseDurations.includes(candidate) ? candidate : defaultDuration;
    const durationChanged = nextDuration !== durationMinutes;

    if (!durationChanged) {
      return;
    }

    isSyncingFromConfigRef.current = true;

    if (durationChanged) {
      setDurationMinutes(nextDuration);
    }

    const resetSyncFlag = () => {
      isSyncingFromConfigRef.current = false;
    };
    if (typeof queueMicrotask === "function") {
      queueMicrotask(resetSyncFlag);
    } else {
      Promise.resolve().then(resetSyncFlag).catch(() => resetSyncFlag());
    }
  }, [config, durationOptions]);

  useEffect(() => {
    if (!onConfigChange || isSyncingFromConfigRef.current) return;
    onConfigChange({
      durationMinutes
    });
  }, [durationMinutes, onConfigChange]);

  const activePresetMinutes = useMemo(() => {
    return durationOptions.find((option) => option.minutes === durationMinutes)?.minutes ?? null;
  }, [durationMinutes, durationOptions]);

  function selectPreset(minutes: number) {
    setDurationMinutes(minutes);
  }

  useEffect(() => {
    if (durationMinutes <= 0) {
      return;
    }

    let cancelled = false;
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/parking/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ durationMinutes })
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          if (!cancelled) {
            setError(
              body.error ?? (isThai ? "ไม่สามารถดึงคำแนะนำได้" : "Unable to fetch recommendations")
            );
          }
          return;
        }

        const data = await response.json();
        if (!cancelled) {
          onResults(data.recommendations as PricingBreakdown[]);
        }
      } catch (error) {
        if (!cancelled) {
          setError(isThai ? "ไม่สามารถดึงคำแนะนำได้" : "Unable to fetch recommendations");
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [durationMinutes, isThai, onResults]);

  return (
    <div className="flex flex-col gap-4 text-xs text-slate-200">
      <div className="rounded-2xl border border-slate-800/70 bg-slate-950/75 px-4 py-3">
        <div className="flex w-full items-center justify-between text-left text-slate-200">
          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            {isThai ? "ระยะเวลาจอด" : "Stay length"}
          </span>
          <span className="inline-flex items-center gap-2 text-[11px] text-slate-300">
            {formatDuration(durationMinutes, language)}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {durationOptions.map((option) => {
            const isActive = activePresetMinutes === option.minutes;
            return (
              <button
                key={option.minutes}
                type="button"
                onClick={() => selectPreset(option.minutes)}
                className={[
                  "rounded-full px-3 py-1 text-[11px] font-medium transition",
                  isActive
                    ? "bg-sky-500/90 text-slate-950"
                    : "bg-slate-900/80 text-slate-200 hover:bg-slate-800"
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
          {error}
        </p>
      ) : null}

      {isPending ? (
        <p className="text-center text-[11px] text-slate-400">
          {isThai ? "กำลังอัปเดตผลลัพธ์…" : "Updating recommendations…"}
        </p>
      ) : null}
    </div>
  );
}
