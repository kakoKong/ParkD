import { ParkingDiscount, ParkingLot, PricingBreakdown } from "@/types/parking";

export interface PricingInput {
  lot: ParkingLot;
  durationMinutes: number;
  spendAmount?: number;
  qualifiers?: ParkingDiscount["qualifier"][];
}

function applyDiscounts({
  lot,
  durationMinutes,
  spendAmount = 0,
  qualifiers = []
}: PricingInput) {
  let bonusMinutes = 0;
  const discountsApplied: ParkingDiscount[] = [];

  for (const discount of lot.discounts) {
    const meetsSpend =
      discount.threshold !== undefined ? spendAmount >= discount.threshold : false;
    const matchesQualifier =
      discount.qualifier !== undefined ? qualifiers.includes(discount.qualifier) : false;
    const isMembership = discount.type === "membership";

    if (
      (discount.type === "purchase" && meetsSpend) ||
      (discount.type === "validation" && matchesQualifier) ||
      (isMembership && discount.threshold === undefined) ||
      (isMembership && meetsSpend)
    ) {
      bonusMinutes += discount.additionalFreeMinutes;
      discountsApplied.push(discount);
    }
  }

  const effectiveFreeMinutes = lot.freeMinutes + bonusMinutes;
  const effectivePaidMinutes = Math.max(durationMinutes - effectiveFreeMinutes, 0);

  return {
    effectiveFreeMinutes,
    effectivePaidMinutes,
    discountsApplied
  };
}

function computeTierCost(lot: ParkingLot, paidMinutes: number) {
  if (paidMinutes <= 0) {
    return { cost: 0, rate: 0 };
  }

  let remainingMinutes = paidMinutes;
  let totalCost = 0;
  let lastRate = 0;

  for (const tier of lot.tiers) {
    if (remainingMinutes <= 0) break;

    if (tier.toMinute) {
      const tierDuration = tier.toMinute - tier.fromMinute + 1;
      const minutesInTier = Math.min(remainingMinutes, tierDuration);
      totalCost += (minutesInTier / 60) * tier.ratePerHour;
      remainingMinutes -= minutesInTier;
      lastRate = tier.ratePerHour;
    } else {
      totalCost += (remainingMinutes / 60) * tier.ratePerHour;
      lastRate = tier.ratePerHour;
      remainingMinutes = 0;
    }
  }

  return { cost: Math.max(totalCost, 0), rate: lastRate };
}

export function calculatePricing(
  input: PricingInput
): PricingBreakdown {
  const { lot, durationMinutes } = input;
  const { effectiveFreeMinutes, effectivePaidMinutes, discountsApplied } = applyDiscounts(input);
  const { cost, rate } = computeTierCost(lot, effectivePaidMinutes);

  return {
    lotId: lot.id,
    lotName: lot.name,
    baseMinutesCharged: durationMinutes,
    effectiveFreeMinutes,
    effectivePaidMinutes,
    totalCost: Number(cost.toFixed(2)),
    discountsApplied,
    hourlyRateAfterFree: rate
  };
}
