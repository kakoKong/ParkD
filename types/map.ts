import type { GeoJSON } from "geojson";
import type mapboxgl from "mapbox-gl";

export type ZoneLevel = "recommended" | "neutral" | "caution" | "avoid" | string;

export interface Zone {
  id: string;
  label: string;
  level: ZoneLevel;
  reason_short?: string | null;
  reason_long?: string | null;
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export type PinType = "scam" | "harassment" | "overcharge" | "other" | string;

export type PinStatus = "pending" | "approved" | "flagged" | "archived" | string;

export type PinSource = "user" | "system" | "partner" | string;

export interface Pin {
  id: string;
  city_id?: number | null;
  type: PinType;
  title: string;
  summary?: string | null;
  details?: string | null;
  location: GeoJSON.Point;
  status?: PinStatus;
  source?: PinSource;
  created_at?: string;
  imageUrl?: string | null;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export interface MapViewRef {
  zoomToZone: (zone: Zone) => void;
  zoomToPin: (pin: Pin) => void;
  zoomToLocation: (lng: number, lat: number) => void;
}

export interface MapViewProps {
  zones: Zone[];
  pins: Pin[];
  center?: [number, number];
  userLocation?: UserLocation | null;
  onZoneClick?: (zone: Zone) => void;
  onPinClick?: (pin: Pin) => void;
  onViewportChange?: (bounds: mapboxgl.LngLatBounds) => void;
  maxBounds?: [[number, number], [number, number]] | null;
  className?: string;
  disableZoom?: boolean;
}

