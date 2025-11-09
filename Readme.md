# ParkD

ParkD is a mock Next.js + Supabase reference implementation that helps drivers discover the best parking options nearby. Users share how long they plan to stay, and the app calculates estimated fees across lots, including free hours and discount policies, and highlights the cheapest options.

## Stack

- Next.js 14 (App Router, TypeScript, Tailwind CSS)
- Mock Supabase client serving local JSON data (ready to swap with a real database)
- Zod for runtime validation and strong API contracts

## Getting Started

```bash
pnpm install
pnpm dev
```

_You can use `npm` or `yarn` if preferred._

## Project Structure

```
app/
  api/parking/lots          → REST endpoint returning all parking lots
  api/parking/recommend     → Recommendation endpoint (POST)
  layout.tsx, page.tsx      → Root layout and landing page with search UI
components/                 → Reusable UI building blocks
lib/                        → Pricing engine + mocked Supabase client
supabase/                   → SQL schema + future migrations
scripts/                    → Placeholder for seed or ETL scripts
```

## Mock Data

`data/parking-lots.json` contains structured policies for each carpark:

- `freeMinutes` baseline free parking allowance
- `tiers` tiered hourly pricing (minute ranges + rate)
- `discounts` additional free minutes unlocked by purchases, movie tickets, memberships, etc.

These feed the pricing engine in `lib/pricing.ts` and power the recommendation API.

## API Contracts

### `POST /api/parking/recommend`

Request body:

```json
{
  "durationMinutes": 300
}
```

Response:

```json
{
  "requestedDurationMinutes": 300,
  "generatedAt": "2025-11-08T12:34:56.000Z",
  "recommendations": [
    {
      "lotId": "central-eastville",
      "lotName": "Central Eastville",
      "baseMinutesCharged": 300,
      "effectiveFreeMinutes": 420,
      "effectivePaidMinutes": 0,
      "totalCost": 0,
      "discountsApplied": ["..."]
    }
  ]
}
```

### `GET /api/parking/lots`

Returns the raw lot definitions to help frontends build filters or maps.

## Database Design (Supabase-ready)

See `supabase/schema.sql` for a relational model:

- `parking_lots` basic metadata (name, address, coordinates, operator)
- `parking_rate_tiers` minute ranges and hourly pricing linked to a lot
- `parking_discounts` qualifying spend or perks granting extra free minutes
- `parking_lot_amenities` amenity tags (EV charging, valet, etc.)

This schema maps 1:many relations needed by the pricing engine. The mock Supabase client reads the JSON into the same shape, so swapping to real tables would only require replacing `lib/supabase/mockClient.ts` with actual Supabase queries.

## Next Steps

- Connect to live Supabase instance and migrate seed data
- Add geospatial search and map visualisations
- Extend perk qualifiers (e.g., time-of-day, loyalty tiers)
- Integrate real-time occupancy + dynamic pricing
# ParkD
