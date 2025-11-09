"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { PricingBreakdown } from "@/types/parking";

export type ParkingSearchConfig = {
  durationMinutes: number;
  spend: number;
  qualifiers: string[];
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

function arraysEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
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
      { label: isThai ? "30 นาที" : "30 min", minutes: 30 },
      { label: isThai ? "1 ชม." : "1 hr", minutes: 60 },
      { label: isThai ? "2 ชม." : "2 hr", minutes: 120 },
      { label: isThai ? "3 ชม." : "3 hr", minutes: 180 },
      { label: isThai ? "4 ชม." : "4 hr", minutes: 240 },
      { label: isThai ? "5 ชม." : "5 hr", minutes: 300 }
    ],
    [isThai]
  );

  const initialDuration =
    typeof config?.durationMinutes === "number"
      ? config.durationMinutes
      : durationOptions[2]?.minutes ?? 120;
  const initialQualifiers =
    config && Array.isArray(config.qualifiers) ? [...config.qualifiers] : [];

  const [durationMinutes, setDurationMinutes] = useState<number>(initialDuration);
  const [customHours, setCustomHours] = useState<string>(() => {
    if (
      typeof config?.durationMinutes === "number" &&
      !durationOptions.some((option) => option.minutes === config.durationMinutes)
    ) {
      return (config.durationMinutes / 60).toString();
    }
    return "";
  });
  const [spendInput, setSpendInput] = useState<string>(() => {
    if (typeof config?.spend === "number" && Number.isFinite(config.spend) && config.spend > 0) {
      return config.spend.toString();
    }
    return "";
  });
  const [qualifiers, setQualifiers] = useState<string[]>(initialQualifiers);
  const isSyncingFromConfigRef = useRef(false);
  const hasAutoCollapsedRef = useRef(false);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showStayControls, setShowStayControls] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!config) return;
    const nextDuration =
      typeof config.durationMinutes === "number"
        ? config.durationMinutes
        : durationOptions[2]?.minutes ?? 120;
    const nextQualifiers = Array.isArray(config.qualifiers) ? config.qualifiers : [];
    const nextSpend =
      typeof config.spend === "number" && Number.isFinite(config.spend) ? config.spend : 0;

    const durationChanged = nextDuration !== durationMinutes;
    const spendChanged = nextSpend !== (spendInput === "" ? 0 : Number(spendInput));
    const qualifiersChanged = !arraysEqual(nextQualifiers, qualifiers);

    if (!durationChanged && !spendChanged && !qualifiersChanged) {
      return;
    }

    isSyncingFromConfigRef.current = true;

    if (durationChanged) {
      setDurationMinutes(nextDuration);
      if (!durationOptions.some((option) => option.minutes === nextDuration)) {
        setCustomHours((nextDuration / 60).toString());
      } else {
        setCustomHours("");
      }
    }
    if (spendChanged) {
      setSpendInput(nextSpend > 0 ? nextSpend.toString() : "");
    }
    if (qualifiersChanged) {
      setQualifiers(nextQualifiers);
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

  const spendValue = useMemo(() => {
    if (spendInput.trim() === "") {
      return 0;
    }
    const numericValue = Number(spendInput);
    if (Number.isNaN(numericValue) || numericValue < 0) {
      return 0;
    }
    return numericValue;
  }, [spendInput]);

  useEffect(() => {
    if (!onConfigChange || isSyncingFromConfigRef.current) return;
    onConfigChange({
      durationMinutes,
      spend: spendValue,
      qualifiers
    });
  }, [durationMinutes, spendValue, qualifiers, onConfigChange]);

  const qualifierOptions = useMemo(
    () => [
      { value: "movie", label: isThai ? "ตั๋วหนัง" : "Movie ticket" },
      { value: "dining", label: isThai ? "ใบเสร็จร้านอาหาร" : "Dining receipt" },
      { value: "grocery", label: isThai ? "สะสมแต้มซูเปอร์มาร์เก็ต" : "Grocery loyalty" }
    ],
    [isThai]
  );

  const activePresetMinutes = useMemo(() => {
    return durationOptions.find((option) => option.minutes === durationMinutes)?.minutes ?? null;
  }, [durationMinutes, durationOptions]);

  function selectPreset(minutes: number) {
    setDurationMinutes(minutes);
    setCustomHours("");
  }

  function handleCustomHoursChange(value: string) {
    setCustomHours(value);

    if (value.trim() === "") {
      return;
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) {
      return;
    }

    const minutes = Math.max(0, Math.round(numericValue * 60));
    setDurationMinutes(minutes);
  }

  function toggleQualifier(value: string) {
    setQualifiers((prev) => {
      const next = prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value];
      return next;
    });
  }

  function handleSpendInputChange(value: string) {
    if (value === "") {
      setSpendInput("");
      return;
    }
    const numericValue = Number(value);
    if (Number.isNaN(numericValue) || numericValue < 0) {
      return;
    }
    setSpendInput(value);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (durationMinutes <= 0) {
      setError(isThai ? "โปรดเลือกเวลาที่ต้องการจอด" : "Please select how long you plan to park.");
      return;
    }

    startTransition(async () => {
      setError(null);
      const response = await fetch("/api/parking/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMinutes,
          spendAmount: spendValue || undefined,
          qualifiers: qualifiers.length ? qualifiers : undefined
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? (isThai ? "ไม่สามารถดึงคำแนะนำได้" : "Unable to fetch recommendations"));
        return;
      }

      const data = await response.json();
      onResults(data.recommendations as PricingBreakdown[]);
    });
  }

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

  useEffect(() => {
    if (!showStayControls && showAdvanced) {
      setShowAdvanced(false);
    }
  }, [showStayControls, showAdvanced]);

  if (variant === "compact") {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 text-xs text-slate-200"
      >
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
              <button
                type="button"
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[11px] text-slate-300 transition hover:bg-slate-800"
              >
                {showAdvanced
                  ? isThai
                    ? "ซ่อนการตั้งค่าเวลาเอง"
                    : "Hide custom hours"
                  : isThai
                  ? "เพิ่มการตั้งค่าเวลาเอง"
                  : "Add custom hours"}
              </button>
              {showAdvanced ? (
                <div className="mt-2 rounded-xl border border-slate-800/80 bg-slate-950/70 px-3 py-2">
                  <label className="text-[10px] uppercase tracking-[0.28em] text-slate-500">
                    {isThai ? "ชั่วโมงกำหนดเอง" : "Custom hours"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.25"
                    value={customHours}
                    onChange={(event) => handleCustomHoursChange(event.target.value)}
                    placeholder={isThai ? "กรอกจำนวนชั่วโมง" : "Enter hours"}
                    className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-[11px] text-slate-400">
              {isThai
                ? `${formatDuration(durationMinutes, language)} ทั้งหมด แตะเพื่อปรับ`
                : `${formatDuration(durationMinutes, language)} total. Tap to adjust.`}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/70 px-4 py-3">
          <label className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
            {isThai ? "งบประมาณการใช้จ่าย" : "Planned spend"}
          </label>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-sm font-semibold text-sky-200">{isThai ? "บาท" : "THB"}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={spendInput}
              onChange={(event) => handleSpendInputChange(event.target.value)}
              className="w-full bg-transparent text-base font-semibold text-slate-100 focus:outline-none"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            {isThai ? "สิทธิ์พิเศษ" : "Perks"}
          </span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {qualifierOptions.map((option) => {
              const isActive = qualifiers.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleQualifier(option.value)}
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

        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending}
        >
          {isPending
            ? isThai
              ? "กำลังค้นหาที่จอด…"
              : "Finding parking…"
            : isThai
            ? "ค้นหาที่จอดใกล้ฉัน"
            : "Find parking nearby"}
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 text-sm"
    >
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
            {isThai ? "ชั่วโมงกำหนดเอง (ไม่บังคับ)" : "Custom hours (optional)"}
          </label>
          <input
            type="number"
            min={0}
            step="0.25"
            value={customHours}
            onChange={(event) => handleCustomHoursChange(event.target.value)}
            placeholder={isThai ? "กรอกชั่วโมงเอง" : "Add hours manually"}
            className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          />
          <p className="mt-2 text-xs text-slate-500">
            {isThai
              ? "ใช้เมื่อคุณต้องการเวลาที่นอกเหนือจากตัวเลือก เราจะใช้ค่าที่ปรับล่าสุด"
              : "Use this if you need something outside the presets. We&apos;ll use whichever value was updated last."}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[13px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            {isThai ? "ยอดใช้จ่ายที่คาดไว้" : "Planned spending"}
          </label>
          <span className="text-[11px] text-slate-500">
            {isThai ? "การใช้จ่ายช่วยปลดล็อกเวลาจอดฟรี" : "Validations unlock free hours"}
          </span>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-baseline gap-2 text-slate-200">
            <span className="text-base font-semibold text-sky-300">{isThai ? "บาท" : "THB"}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={spendInput}
              onChange={(event) => handleSpendInputChange(event.target.value)}
              className="w-full bg-transparent text-2xl font-semibold text-slate-100 focus:outline-none"
              placeholder="0"
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {isThai
              ? "ระบุจำนวนเงินที่คาดว่าจะใช้เพื่อให้เราคำนวณสิทธิ์จอดฟรี"
              : "Share how much you expect to spend so we can factor in parking validations."}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-[13px] font-semibold uppercase tracking-[0.28em] text-slate-400">
          {isThai ? "สิทธิ์ที่คุณสามารถใช้" : "Perks you can claim"}
        </span>
        <div className="flex flex-wrap gap-2">
          {qualifierOptions.map((option) => {
            const isActive = qualifiers.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleQualifier(option.value)}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
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
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-400/90 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isPending}
      >
        {isPending
          ? isThai
            ? "กำลังคำนวณตัวเลือก…"
            : "Calculating your options…"
          : isThai
          ? "แสดงที่จอดใกล้ฉัน"
          : "Show me nearby parking"}
      </button>
    </form>
  );
}
