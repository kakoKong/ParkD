create table if not exists parking_lots (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  address text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  operator text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists parking_rate_tiers (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references parking_lots(id) on delete cascade,
  from_minute integer not null,
  to_minute integer,
  rate_per_hour numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists parking_discounts (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references parking_lots(id) on delete cascade,
  discount_type text not null check (discount_type in ('purchase', 'validation', 'membership')),
  description text,
  threshold_amount numeric(10,2),
  qualifier text,
  additional_free_minutes integer not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists parking_lot_amenities (
  lot_id uuid not null references parking_lots(id) on delete cascade,
  amenity text not null,
  primary key (lot_id, amenity)
);

create table if not exists parking_tags (
  lot_id uuid not null references parking_lots(id) on delete cascade,
  tag text not null,
  primary key (lot_id, tag)
);
