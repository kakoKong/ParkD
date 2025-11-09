"use client";

import type { ParkingLot, PricingBreakdown } from "@/types/parking";

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
  collapsed = false
}: SelectedLotDetailsProps) {
  const isThai = language === "th";

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

  if (variant === "compact") {
    const handleContainerClick = onOpenDetail
      ? () => {
          onOpenDetail();
        }
      : undefined;

    const handleContainerKeyDown = onOpenDetail
      ? (event: React.KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenDetail();
          }
        }
      : undefined;

    return (
      <div
        className={[
          "flex flex-col gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/75 px-4 py-5 text-xs text-slate-100 shadow-lg shadow-slate-950/50 transition",
          onOpenDetail ? "cursor-pointer hover:border-slate-600 hover:bg-slate-900/80" : ""
        ].join(" ")}
        onClick={handleContainerClick}
        onKeyDown={handleContainerKeyDown}
        role={onOpenDetail ? "button" : undefined}
        tabIndex={onOpenDetail ? 0 : undefined}
        aria-label={onOpenDetail ? (isThai ? "ดูรายละเอียดที่จอดรถ" : "View parking details") : undefined}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-100">{lot.name}</h3>
            {!collapsed ? <p className="text-[11px] text-slate-400">{lot.address}</p> : null}
          </div>
          <div className="flex flex-col items-end gap-1">
            {pricing ? (
              <span className="text-sm font-semibold text-sky-200">
                {pricing.totalCost <= 0
                  ? isThai
                    ? "ฟรี"
                    : "Free"
                  : `${pricing.totalCost.toFixed(0)} THB`}
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">
                {isThai ? "กำลังคำนวณ" : "Awaiting estimate"}
              </span>
            )}
          </div>
        </div>

        {!collapsed ? (
          <>
            <div className="flex items-center justify-between rounded-xl border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-300">
              <span>{isThai ? "เวลาจอดฟรี" : "Free allowance"}</span>
              <span className="font-semibold text-slate-100">
                {formatMinutes(lot.freeMinutes, language)}
              </span>
            </div>

            {pricing ? (
              <div className="flex items-center justify-between rounded-xl border border-slate-800/70 bg-slate-950/70 px-3 py-2 text-[11px] text-slate-300">
                <span>{isThai ? "หลังเวลาฟรี" : "After free time"}</span>
                <span className="font-semibold text-slate-100">
                  {pricing.hourlyRateAfterFree.toFixed(0)} {isThai ? "บาท/ชม." : "THB/hr"}
                </span>
              </div>
            ) : null}

            {lot.discounts.length ? (
              <div className="flex flex-wrap gap-1.5">
                {lot.discounts.slice(0, 2).map((discount) => (
                  <span
                    key={discount.id}
                    className="rounded-full bg-slate-900/70 px-3 py-1 text-[10px] text-slate-300"
                  >
                    {isThai
                      ? `+${formatMinutes(discount.additionalFreeMinutes, language)} พร้อม ${discount.type}`
                      : `+${formatMinutes(discount.additionalFreeMinutes, language)} with ${discount.type}`}
                  </span>
                ))}
                {lot.discounts.length > 2 ? (
                  <span className="rounded-full bg-slate-900/70 px-3 py-1 text-[10px] text-slate-500">
                    {isThai
                      ? `+${lot.discounts.length - 2} เพิ่มเติม`
                      : `+${lot.discounts.length - 2} more`}
                  </span>
                ) : null}
              </div>
            ) : null}

            {onOpenDetail ? (
              <div className="mt-1 text-center text-[10px] uppercase tracking-[0.2em] text-slate-500">
                {isThai ? "แตะเพื่อดูรายละเอียดทั้งหมด" : "Tap for full details"}
              </div>
            ) : null}
          </>
        ) : null}
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
          {pricing
            ? isThai
              ? "ประเมินแล้ว"
              : "Estimated"
            : isThai
            ? "รอดำเนินการ"
            : "Awaiting"}
          </span>
          {pricing ? (
            <span className="rounded-full bg-sky-500/20 px-3 py-1 text-sm font-semibold text-sky-200">
            {pricing.totalCost <= 0
              ? isThai
                ? "ฟรี"
                : "Free"
              : `${pricing.totalCost.toFixed(2)} THB`}
            </span>
          ) : null}
        </div>
      </div>

      {pricing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-200">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
            {isThai ? "ค่าจอดรวม" : "Total cost"}
          </p>
            <p className="mt-2 text-xl font-semibold text-slate-100">
            {pricing.totalCost <= 0
              ? isThai
                ? "ฟรี"
                : "Free"
              : `${pricing.totalCost.toFixed(2)} THB`}
            </p>
          <p className="mt-1 text-xs text-slate-400">
            {isThai
              ? "รวมสิทธิ์และการใช้จ่ายที่คุณระบุแล้ว"
              : "Includes your planned perks and spend."}
          </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-200">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
            {isThai ? "หลังเวลาฟรี" : "After free time"}
          </p>
            <p className="mt-2 text-xl font-semibold text-slate-100">
            {pricing.hourlyRateAfterFree.toFixed(2)} {isThai ? "บาท/ชม." : "THB/hr"}
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
          {formatMinutes(lot.freeMinutes, language)}
        </dd>
        </div>
        {topTier ? (
          <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
          <dt className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
            {isThai ? "ระดับราคาที่คิดเงินแรก" : "First paid tier"}
          </dt>
            <dd className="mt-2 text-sm font-semibold text-slate-100">
            {`${topTier.ratePerHour} ${isThai ? "บาท/ชม." : "THB/hr"}`}
            {topTier.toMinute
              ? isThai
                ? ` สูงสุด ${formatMinutes(topTier.toMinute - lot.freeMinutes, language)}`
                : ` up to ${formatMinutes(topTier.toMinute - lot.freeMinutes, language)}`
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
              <li key={discount.id} className="flex flex-col gap-1 rounded-lg bg-slate-950/70 px-3 py-2">
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

