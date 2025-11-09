import { NextResponse } from "next/server";
import { z } from "zod";

import { calculatePricing } from "@/lib/pricing";
import { createServerClient } from "@/lib/supabase/server";
import type { RecommendationResponse, DiscountQualifier } from "@/types/parking";

const qualifierEnum = z.enum(["movie", "dining", "grocery", "membership", "other"]);

const bodySchema = z.object({
  durationMinutes: z
    .number({ required_error: "durationMinutes is required" })
    .int()
    .positive(),
  spendAmount: z.number().nonnegative().optional(),
  qualifiers: z.array(qualifierEnum).optional()
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);

  const result = bodySchema.safeParse(json);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: result.error.issues },
      { status: 400 }
    );
  }

  const { durationMinutes, spendAmount, qualifiers } = result.data;
  const client = createServerClient();
  const { data: parkingLots, error } = await client.listParkingLots();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const qualifierInput = qualifiers ?? [];

  const recommendations = parkingLots
    .map((lot) =>
      calculatePricing({
        lot,
        durationMinutes,
        spendAmount,
        qualifiers: qualifierInput as DiscountQualifier[]
      })
    )
    .sort((a, b) => a.totalCost - b.totalCost);

  const response: RecommendationResponse = {
    requestedDurationMinutes: durationMinutes,
    recommendations,
    generatedAt: new Date().toISOString()
  };

  return NextResponse.json(response);
}
