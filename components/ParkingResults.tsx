import type { PricingBreakdown } from "@/types/parking";

interface ParkingResultsProps {
  results: PricingBreakdown[];
  selectedLotId?: string | null;
  onSelectLot?: (lotId: string) => void;
}

export function ParkingResults({ results, selectedLotId, onSelectLot }: ParkingResultsProps) {
  if (!results.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700/80 bg-slate-950/40 p-5 text-center text-sm text-slate-400">
        Start with a search to see curated parking options tailored to your stay.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {results.map((result, index) => {
        const freeHours = (result.effectiveFreeMinutes / 60).toFixed(1);
        const paidHours = (result.effectivePaidMinutes / 60).toFixed(1);
        const isSelected = selectedLotId === result.lotId;
        const label = index === 0 ? "Top match" : "Option";

        return (
          <button
            type="button"
            key={result.lotId}
            onClick={() => onSelectLot?.(result.lotId)}
            className={[
              "group w-full rounded-2xl border p-5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60",
              "bg-slate-950/70 text-slate-100",
              isSelected
                ? "border-sky-400/60 shadow-lg shadow-sky-500/20"
                : "border-slate-800 hover:border-slate-600 hover:bg-slate-950"
            ].join(" ")}
          >
            <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  <span className="h-1 w-6 rounded-full bg-sky-500/50" />
                  {label}
                </span>
                <h3 className="text-lg font-semibold text-slate-100">{result.lotName}</h3>
                <p className="text-xs text-slate-400">
                  {result.discountsApplied.length ? "Includes validation perks" : "No perks needed"}
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 text-right sm:items-end">
                <span className="rounded-full bg-sky-500/20 px-3 py-1 text-sm font-semibold text-sky-200">
                  {result.totalCost <= 0 ? "Free" : `${result.totalCost.toFixed(2)} THB`}
                </span>
                <span className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
                  Total estimate
                </span>
              </div>
            </header>

            <dl className="mt-4 grid gap-3 text-[11px] text-slate-300 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <dt className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Free time</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-100">{freeHours}h</dd>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <dt className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Paid time</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-100">{paidHours}h</dd>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <dt className="text-[10px] uppercase tracking-[0.3em] text-slate-500">After free</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-100">
                  {result.hourlyRateAfterFree} THB/hr
                </dd>
              </div>
            </dl>

            {result.discountsApplied.length ? (
              <p className="mt-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                {result.discountsApplied.map((discount) => discount.description).join(", ")}
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
