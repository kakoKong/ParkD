"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { PricingBreakdown } from "@/types/parking";

export type ParkingSearchConfig = {
  durationMinutes: number;
};

interface ParkingSearchFormProps {
  onResults: (results: PricingBreakdown[]) => void;
  variant?: "default" | "compact";
  autoCollapseStayLength?: boolean;
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

function formatHoursInput(minutes: number) {
  const hours = minutes / 60;
  if (!Number.isFinite(hours) || hours <= 0) {
    return "";
  }
  return Math.max(0, Math.round(hours)).toString();
}

export function ParkingSearchForm({
  onResults,
  variant = "default",
  autoCollapseStayLength = false,
  language = "en",
  config,
  onConfigChange
}: ParkingSearchFormProps) {
  const isThai = language === "th";
  const durationOptions = useMemo<DurationOption[]>(
    () => [
      { label: isThai ? "1 ชม." : "1 hr", minutes: 60 },
      { label: isThai ? "2 ชม." : "2 hr", minutes: 120 },
      { label: isThai ? "3 ชม." : "3 hr", minutes: 180 }
    ],
    [isThai]
  );

  const initialDuration =
    typeof config?.durationMinutes === "number"
      ? config.durationMinutes
      : durationOptions[2]?.minutes ?? 120;
  const [durationMinutes, setDurationMinutes] = useState<number>(initialDuration);
  const [customHours, setCustomHours] = useState<string>(() => formatHoursInput(initialDuration));
  const isSyncingFromConfigRef = useRef(false);
  const hasAutoCollapsedRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showStayControls, setShowStayControls] = useState(true);

  useEffect(() => {
    if (!config) return;
    const nextDuration =
      typeof config.durationMinutes === "number"
        ? config.durationMinutes
        : durationOptions[2]?.minutes ?? 120;
    const durationChanged = nextDuration !== durationMinutes;

    if (!durationChanged) {
      return;
    }

    isSyncingFromConfigRef.current = true;

    if (durationChanged) {
      setDurationMinutes(nextDuration);
      setCustomHours(formatHoursInput(nextDuration));
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
    setCustomHours(formatHoursInput(minutes));
  }

  function handleCustomHoursChange(value: string) {
    if (value.trim() === "") {
      setCustomHours("");
      setDurationMinutes(0);
      return;
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      setCustomHours(value);
      return;
    }

    const roundedHours = Math.max(0, Math.round(numericValue));
    const minutes = roundedHours * 60;
    setDurationMinutes(minutes);
    setCustomHours(roundedHours > 0 ? roundedHours.toString() : "");
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

  useEffect(() => {
    if (autoCollapseStayLength) {
      if (!hasAutoCollapsedRef.current) {
        setShowStayControls(false);
        hasAutoCollapsedRef.current = true;
      }
      return;
    }
    hasAutoCollapsedRef.current = false;
    setShowStayControls(true);
  }, [autoCollapseStayLength]);

  if (variant === "compact") {
    return (
      <div className="flex flex-col gap-4 text-xs text-slate-200">
        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/75 px-4 py-3">
          <button
            type="button"
            onClick={() => setShowStayControls((prev) => !prev)}
            className="flex w-full items-center justify-between text-left text-slate-200"
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              {isThai ? "ระยะเวลาจอด" : "Stay length"}
            </span>
            <span className="inline-flex items-center gap-2 text-[11px] text-slate-300">
              {formatDuration(durationMinutes, language)}
              <span className="text-slate-500">{showStayControls ? "−" : "+"}</span>
            </span>
          </button>

          {showStayControls ? (
            <>
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
              <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/70 px-3 py-2">
                <label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                  {isThai ? "ชั่วโมง (เลื่อนเพื่อปรับ)" : "Hours (scroll to adjust)"}
                </label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={customHours}
                  onChange={(event) => handleCustomHoursChange(event.target.value)}
                  placeholder={isThai ? "กรอกจำนวนชั่วโมง" : "Enter hours"}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                  inputMode="numeric"
                />
              </div>
            </>
          ) : (
            <p className="mt-3 text-[11px] text-slate-400">
              {isThai
                ? `${formatDuration(durationMinutes, language)} ทั้งหมด แตะเพื่อปรับ`
                : `${formatDuration(durationMinutes, language)} total. Tap to adjust.`}
            </p>
          )}
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

  return (
    <div className="space-y-6 text-sm">
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <label className="text-[13px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            {isThai ? "วางแผนเวลาจอด" : "Plan your stay"}
          </label>
          {durationMinutes > 0 ? (
            <span className="text-xs text-slate-500">
              {isThai
                ? `คุณกำลังวางแผนจอด ${formatDuration(durationMinutes, language)} ทั้งหมด`
                : `You're planning for ${formatDuration(durationMinutes, language)} total`}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {durationOptions.map((option) => {
            const isActive = activePresetMinutes === option.minutes;
            return (
              <button
                key={option.minutes}
                type="button"
                onClick={() => selectPreset(option.minutes)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  isActive
                    ? "border-sky-400 bg-sky-500/20 text-sky-200"
                    : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-slate-500 hover:text-slate-100"
                ].join(" ")}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <label className="text-xs uppercase tracking-[0.28em] text-slate-500">
            {isThai ? "ชั่วโมง (เลื่อนเพื่อปรับ)" : "Hours (scroll to adjust)"}
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={customHours}
            onChange={(event) => handleCustomHoursChange(event.target.value)}
            placeholder={isThai ? "กรอกชั่วโมงเอง" : "Add hours manually"}
            className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            inputMode="numeric"
          />
          <p className="mt-2 text-xs text-slate-500">
            {isThai
              ? "ใช้เมื่อคุณต้องการเวลาที่นอกเหนือจากตัวเลือก เราจะใช้ค่าที่ปรับล่าสุด"
              : "Use this if you need something outside the presets. We&apos;ll use whichever value was updated last."}
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}

      {isPending ? (
        <p className="text-center text-xs text-slate-400">
          {isThai ? "กำลังอัปเดตผลลัพธ์…" : "Updating recommendations…"}
        </p>
      ) : null}
    </div>
  );
}
