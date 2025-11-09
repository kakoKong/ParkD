"use client";

import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";

import { calculatePricing } from "@/lib/pricing";
import type { DiscountQualifier, ParkingLot, PricingBreakdown } from "@/types/parking";

interface SelectedLotDetailsProps {
  lot?: ParkingLot | null;
  pricing?: PricingBreakdown | null;
  distanceKm?: number | null;
  variant?: "default" | "compact";
  onOpenDetail?: () => void;
  language?: "en" | "th";
  collapsed?: boolean;
}

function formatMinutes(minutes: number, language: "en" | "th") {
  const hours = minutes / 60;
  if (hours >= 1) {
    const label =
      language === "th"
        ? "ชม."
        : hours % 1 === 0 && hours === 1
        ? "hr"
        : "hrs";
    return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)} ${label}`.trim();
  }
  return `${minutes} ${language === "th" ? "นาที" : "mins"}`;
}

export function SelectedLotDetails({
  lot,
  pricing,
  distanceKm: _distanceKm,
  variant = "default",
  onOpenDetail,
  language = "en",
  collapsed: _collapsed = false
}: SelectedLotDetailsProps) {
  const isThai = language === "th";

  const qualifierOptions = useMemo(
    () => [
      { value: "movie" as const, label: isThai ? "ดูภาพยนตร์" : "Movie ticket" },
      { value: "dining" as const, label: isThai ? "รับประทานอาหาร" : "Dining receipt" },
      { value: "grocery" as const, label: isThai ? "ซูเปอร์มาร์เก็ต" : "Grocery loyalty" },
      { value: "membership" as const, label: isThai ? "สมาชิกโครงการ" : "Membership" }
    ],
    [isThai]
  );

  const [spendInput, setSpendInput] = useState<string>("");
  const [selectedQualifiers, setSelectedQualifiers] = useState<DiscountQualifier[]>([]);

  useEffect(() => {
    if (!lot) {
      setSpendInput("");
      setSelectedQualifiers([]);
      return;
    }

    setSpendInput("");

    if (pricing?.discountsApplied?.length) {
      const inferred = pricing.discountsApplied
        .map((discount) => discount.qualifier)
        .filter((qualifier): qualifier is DiscountQualifier => Boolean(qualifier));
      setSelectedQualifiers(Array.from(new Set(inferred)));
    } else {
      setSelectedQualifiers([]);
    }
  }, [lot?.id, pricing?.lotId]);

  const spendAmount = useMemo(() => {
    if (spendInput.trim() === "") return 0;
    const numeric = Number(spendInput);
    if (!Number.isFinite(numeric) || numeric < 0) return 0;
    return numeric;
  }, [spendInput]);

  const baseDurationMinutes = pricing?.baseMinutesCharged ?? 0;

  const effectivePricing = useMemo(() => {
    if (!lot || !pricing) {
      return pricing ?? null;
    }

    try {
      return calculatePricing({
        lot,
        durationMinutes: baseDurationMinutes,
        spendAmount,
        qualifiers: selectedQualifiers
      });
    } catch (error) {
      console.error("Unable to calculate adjusted pricing", error);
      return pricing;
    }
  }, [lot, pricing, baseDurationMinutes, spendAmount, selectedQualifiers]);

  const displayPricing = effectivePricing ?? pricing ?? null;
  const hasAdjustments = spendAmount > 0 || selectedQualifiers.length > 0;
  const costDelta = displayPricing && pricing ? displayPricing.totalCost - pricing.totalCost : 0;
  const hasCostDelta = Math.abs(costDelta) >= 0.01;

  const appliedDiscountIds = useMemo(() => {
    if (!displayPricing?.discountsApplied) return new Set<string>();
    return new Set(displayPricing.discountsApplied.map((discount) => discount.id));
  }, [displayPricing?.discountsApplied]);

  function handleSpendChange(value: string) {
    if (value === "") {
      setSpendInput("");
      return;
    }

    const numeric = Number(value);
    if (Number.isNaN(numeric) || numeric < 0) return;
    setSpendInput(value);
  }

  function toggleQualifier(next: DiscountQualifier) {
    setSelectedQualifiers((prev) =>
      prev.includes(next) ? prev.filter((item) => item !== next) : [...prev, next]
    );
  }

  if (!lot) {
    if (variant === "compact") {
      return (
        <div className="rounded-2xl border border-dashed border-slate-800/60 bg-slate-950/60 px-4 py-5 text-xs text-slate-300">
          {isThai
            ? "แตะหมุดเพื่อดูราคากับระยะทางเดิน"
            : "Tap a pin to preview pricing and walking distance."}
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/40 p-5 text-sm text-slate-400">
        {isThai
          ? "เลือกหมุดบนแผนที่เพื่อดูรายละเอียดระดับราคา สิทธิ์จอดฟรี และประมาณการค่าใช้จ่ายของคุณ"
          : "Select a pin on the map to reveal detailed pricing tiers, validation perks, and your personalised cost estimate."}
      </div>
    );
  }

  const topTier = lot.tiers[0];
  const resolvedFreeMinutes = displayPricing?.effectiveFreeMinutes ?? lot.freeMinutes ?? 0;
  const firstTierRemaining =
    topTier?.toMinute !== undefined ? Math.max(topTier.toMinute - resolvedFreeMinutes, 0) : null;

  if (variant === "compact") {
    const handleContainerClick = onOpenDetail
      ? () => {
          onOpenDetail();
        }
      : undefined;

    const handleContainerKeyDown = onOpenDetail
      ? (event: KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenDetail();
          }
        }
      : undefined;

    const priceLabel = displayPricing
      ? displayPricing.totalCost <= 0
        ? isThai
          ? "ฟรี"
          : "Free"
        : `${displayPricing.totalCost.toFixed(0)} THB`
      : isThai
      ? "กำลังคำนวณ…"
      : "Updating…";

    return (
      <div
        className={[
          "flex items-center justify-between gap-3 rounded-2xl border border-slate-800/70 bg-slate-950/75 px-4 py-4 text-xs text-slate-100 shadow-lg shadow-slate-950/50 transition",
          onOpenDetail ? "cursor-pointer hover:border-slate-600 hover:bg-slate-900/80" : ""
        ].join(" ")}
        onClick={handleContainerClick}
        onKeyDown={handleContainerKeyDown}
        role={onOpenDetail ? "button" : undefined}
        tabIndex={onOpenDetail ? 0 : undefined}
        aria-label={onOpenDetail ? (isThai ? "ดูรายละเอียดที่จอดรถ" : "View parking details") : undefined}
      >
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate text-sm font-semibold text-slate-100">{lot.name}</h3>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-sm font-semibold text-sky-200">{priceLabel}</span>
          {hasCostDelta ? (
            <span
              className={[
                "text-[10px] font-semibold",
                costDelta < 0 ? "text-emerald-300" : "text-amber-300"
              ].join(" ")}
            >
              {costDelta < 0
                ? `-${Math.abs(costDelta).toFixed(0)} THB`
                : `+${costDelta.toFixed(0)} THB`}
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 shadow-inner shadow-slate-950/30">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-100">{lot.name}</h3>
          <p className="text-xs text-slate-400">{lot.address}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-400">
          {displayPricing
            ? isThai
              ? "ประเมินแล้ว"
              : "Estimated"
            : isThai
            ? "รอดำเนินการ"
            : "Awaiting"}
          </span>
          {displayPricing ? (
            <span className="rounded-full bg-sky-500/20 px-3 py-1 text-sm font-semibold text-sky-200">
            {displayPricing.totalCost <= 0
              ? isThai
                ? "ฟรี"
                : "Free"
              : `${displayPricing.totalCost.toFixed(2)} THB`}
            </span>
          ) : null}
        </div>
      </div>

      {pricing ? (
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-200">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              {isThai ? "อัปเดตสิทธิ์รับเวลาจอดฟรี" : "Adjust parking perks"}
            </span>
            <p className="text-xs text-slate-400">
              {isThai
                ? "ลองกรอกยอดใช้จ่ายหรือเลือกสิทธิ์ที่ใช้ได้เพื่อดูผลลัพธ์ใหม่ทันที"
                : "Enter how much you plan to spend or which perks you can claim to refresh the estimate."}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                {isThai ? "ยอดใช้จ่ายของคุณ" : "Your spend amount"}
              </label>
              <div className="mt-2 flex items-baseline gap-3 rounded-xl border border-slate-800/70 bg-slate-950/70 px-3 py-2">
                <span className="text-sm font-semibold text-sky-200">{isThai ? "บาท" : "THB"}</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={spendInput}
                  onChange={(event) => handleSpendChange(event.target.value)}
                  placeholder="0"
                  className="w-full bg-transparent text-lg font-semibold text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <span className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                {isThai ? "สิทธิ์ที่คุณมี" : "Perks you expect to use"}
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {qualifierOptions.map((option) => {
                  const isActive = selectedQualifiers.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleQualifier(option.value)}
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium transition",
                        isActive
                          ? "border-sky-400 bg-sky-500/20 text-sky-100"
                          : "border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:bg-slate-900"
                      ].join(" ")}
                      aria-pressed={isActive}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {hasCostDelta ? (
              <div
                className={[
                  "rounded-xl border px-3 py-2 text-xs",
                  costDelta < 0
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-200"
                ].join(" ")}
              >
                {costDelta < 0
                  ? isThai
                    ? `ประหยัดเพิ่ม ${Math.abs(costDelta).toFixed(2)} บาท จากสิทธิ์ที่เลือก`
                    : `You save an extra ${Math.abs(costDelta).toFixed(2)} THB with these perks.`
                  : isThai
                  ? `ค่าใช้จ่ายเพิ่ม ${costDelta.toFixed(2)} บาท จากค่าจอดที่คำนวณ`
                  : `Your estimate increases by ${costDelta.toFixed(2)} THB with the current inputs.`}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">
                {isThai
                  ? hasAdjustments
                    ? "ยังไม่มีการเปลี่ยนแปลง ลองปรับยอดใช้จ่ายหรือสิทธิ์เพิ่มเติม"
                    : "เริ่มกรอกยอดใช้จ่ายหรือเลือกสิทธิ์เพื่อดูผลลัพธ์ใหม่"
                  : hasAdjustments
                  ? "No change yet—try adjusting the amount or perks differently."
                  : "Enter an amount or toggle a perk to see how the total changes."}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {displayPricing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-200">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
            {isThai ? "ค่าจอดรวม" : "Total cost"}
          </p>
            <p className="mt-2 text-xl font-semibold text-slate-100">
            {displayPricing.totalCost <= 0
              ? isThai
                ? "ฟรี"
                : "Free"
              : `${displayPricing.totalCost.toFixed(2)} THB`}
            </p>
          <p className="mt-1 text-xs text-slate-400">
            {isThai
              ? "รวมเวลาฟรีและสิทธิ์พิเศษที่มีให้ในพื้นที่"
              : "Includes free allowances and available perks for this site."}
          </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-200">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
            {isThai ? "หลังเวลาฟรี" : "After free time"}
          </p>
            <p className="mt-2 text-xl font-semibold text-slate-100">
            {displayPricing.hourlyRateAfterFree.toFixed(2)} {isThai ? "บาท/ชม." : "THB/hr"}
            </p>
          <p className="mt-1 text-xs text-slate-400">
            {isThai
              ? "อัตรารายชั่วโมงหลังหมดเวลาฟรี"
              : "Hourly rate once free minutes are used."}
          </p>
          </div>
        </div>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
        <dt className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
          {isThai ? "เวลาจอดฟรี" : "Free allowance"}
        </dt>
        <dd className="mt-2 text-sm font-semibold text-slate-100">
          {formatMinutes(resolvedFreeMinutes, language)}
        </dd>
        </div>
        {topTier ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
          <dt className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
            {isThai ? "ระดับราคาที่คิดเงินแรก" : "First paid tier"}
          </dt>
            <dd className="mt-2 text-sm font-semibold text-slate-100">
            {`${topTier.ratePerHour} ${isThai ? "บาท/ชม." : "THB/hr"}`}
            {firstTierRemaining && firstTierRemaining > 0
              ? isThai
                ? ` สูงสุด ${formatMinutes(firstTierRemaining, language)}`
                : ` up to ${formatMinutes(firstTierRemaining, language)}`
              : ""}
            </dd>
          </div>
        ) : null}
      </dl>

      {lot.tiers.length > 1 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300">
        <p className="mb-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">
          {isThai ? "ระดับราคาถัดไป" : "Additional tiers"}
        </p>
          <ul className="space-y-2">
            {lot.tiers.slice(1).map((tier) => (
              <li key={tier.id} className="flex items-center justify-between rounded-lg bg-slate-950/60 px-3 py-2">
              <span>
                {isThai ? "ถึง" : "Till"}{" "}
                {tier.toMinute
                  ? formatMinutes(tier.toMinute, language)
                  : isThai
                  ? "สูงสุด"
                  : "max"}
              </span>
              <span className="font-medium text-slate-100">
                {tier.ratePerHour} {isThai ? "บาท/ชม." : "THB/hr"}
              </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {lot.discounts.length ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300">
        <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-slate-500">
          {isThai ? "สิทธิ์จอดเพิ่มเติม" : "Validation perks"}
        </p>
          <ul className="space-y-2">
            {lot.discounts.map((discount) => (
              <li
                key={discount.id}
                className={[
                  "flex flex-col gap-1 rounded-lg px-3 py-2 transition",
                  appliedDiscountIds.has(discount.id)
                    ? "border border-sky-500/50 bg-sky-500/10 text-sky-100"
                    : "bg-slate-950/70 text-slate-300"
                ].join(" ")}
              >
                <span className="text-[11px] font-semibold uppercase text-slate-400">{discount.type}</span>
                <span className="text-slate-100">{discount.description}</span>
                <span className="text-[11px] text-slate-500">
                {isThai
                  ? `+${formatMinutes(discount.additionalFreeMinutes, language)} ฟรี`
                  : `+${formatMinutes(discount.additionalFreeMinutes, language)} free`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {onOpenDetail ? (
        <button
          type="button"
          onClick={onOpenDetail}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
        >
        {isThai ? "ดูตัวเลือกคล้ายกัน" : "View more like this"}
        </button>
      ) : null}
    </div>
  );
}

