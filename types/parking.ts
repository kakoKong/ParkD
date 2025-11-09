export type DiscountQualifier = "movie" | "dining" | "grocery" | "membership" | "other";

export interface ParkingDiscount {
  id: string;
  type: "purchase" | "validation" | "membership";
  description: string;
  threshold?: number;
  qualifier?: DiscountQualifier;
  additionalFreeMinutes: number;
  metadata?: Record<string, unknown>;
}

export interface RateTier {
  id: string;
  fromMinute: number;
  toMinute?: number;
  ratePerHour: number;
}

export interface ParkingLot {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  freeMinutes: number;
  tiers: RateTier[];
  discounts: ParkingDiscount[];
  amenities: string[];
  operator: string;
  tags: string[];
  metadata?: Record<string, unknown>;
  imageUrl?: string;
}

export interface PricingBreakdown {
  lotId: string;
  lotName: string;
  baseMinutesCharged: number;
  effectiveFreeMinutes: number;
  effectivePaidMinutes: number;
  totalCost: number;
  discountsApplied: ParkingDiscount[];
  hourlyRateAfterFree: number;
}

export interface RecommendationRequest {
  latitude?: number;
  longitude?: number;
  durationMinutes: number;
  spendAmount?: number;
  qualifiers?: DiscountQualifier[];
}

export interface RecommendationResponse {
  requestedDurationMinutes: number;
  recommendations: PricingBreakdown[];
  generatedAt: string;
}
