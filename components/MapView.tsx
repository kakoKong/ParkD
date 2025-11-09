"use client";

import React, {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  forwardRef,
  useCallback,
  memo
} from "react";
import mapboxgl from "mapbox-gl";
import type { GeoJSON } from "geojson";

import type { MapViewRef, MapViewProps, Pin, Zone } from "@/types/map";
import { getZoneColor } from "@/lib/map-utils";

const ZONE_SOURCE_ID = "zones";
const ZONE_FILL_LAYER_ID = "zones-layer";
const ZONE_OUTLINE_LAYER_ID = "zones-outline";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

function createMarkerElement(pin: Pin) {
  const wrapper = document.createElement("button");
  wrapper.type = "button";
  wrapper.className =
    "group relative flex -translate-y-2 flex-col items-center gap-1 text-xs font-semibold text-slate-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400";

  const bubble = document.createElement("div");
  bubble.className =
    "flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-white shadow-lg shadow-slate-900/40 ring-2 ring-white/20 transition group-hover:scale-105";

  if (pin.imageUrl) {
    bubble.style.backgroundImage = `url(${pin.imageUrl})`;
    bubble.style.backgroundSize = "cover";
    bubble.style.backgroundPosition = "center";
  } else {
    bubble.style.background =
      "linear-gradient(135deg, rgba(14,165,233,0.85) 0%, rgba(56,189,248,0.95) 100%)";
    const label = document.createElement("span");
    label.textContent = (pin.title ?? "P").trim().charAt(0).toUpperCase() || "P";
    label.className = "text-lg font-bold text-white drop-shadow-sm";
    bubble.appendChild(label);
  }

  const point = document.createElement("div");
  point.className =
    "h-3 w-3 rotate-45 rounded-sm border-2 border-white bg-sky-400 shadow-md shadow-slate-900/40 transition group-hover:translate-y-0.5";

  wrapper.appendChild(bubble);
  wrapper.appendChild(point);

  return wrapper;
}

function computeVerticalOffset(map: mapboxgl.Map, ratio = 0.25) {
  try {
    const container = map.getContainer?.();
    const cssHeight =
      container?.getBoundingClientRect().height ??
      (() => {
        const canvasHeight = map.getCanvas().height ?? 0;
        if (!canvasHeight) return 0;
        const devicePixelRatio =
          typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        return canvasHeight / devicePixelRatio;
      })();
    if (!cssHeight) return 0;
    const clampedRatio = Math.min(Math.max(ratio, 0), 0.35);
    return -Math.round(cssHeight * clampedRatio);
  } catch {
    return 0;
  }
}

const MapViewComponent = forwardRef<MapViewRef, MapViewProps>(
  (
    {
      zones,
      pins,
      center = [100.5018, 13.7563],
      userLocation,
      onZoneClick,
      onPinClick,
      onViewportChange,
      maxBounds,
      className = "",
      disableZoom = false
    },
    ref
  ) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
    const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);

    const onZoneClickRef = useRef(onZoneClick);
    const onPinClickRef = useRef(onPinClick);
    const onViewportChangeRef = useRef(onViewportChange);

    useEffect(() => {
      onZoneClickRef.current = onZoneClick;
      onPinClickRef.current = onPinClick;
      onViewportChangeRef.current = onViewportChange;
    }, [onPinClick, onViewportChange, onZoneClick]);

    const disposeMarkers = useCallback(() => {
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        zoomToZone: (zone: Zone) => {
          if (!mapRef.current || !mapLoaded) return;

          try {
            const geometry = zone.geom;
            const coordinates =
              "coordinates" in geometry
                ? geometry.type === "Polygon"
                  ? geometry.coordinates.flat()
                  : geometry.coordinates.flat(2)
                : [];

            if (!coordinates.length) return;

            const [firstLng, firstLat] = coordinates[0] as [number, number];
            const bounds = coordinates.reduce(
              (acc, coord) => acc.extend(coord as [number, number]),
              new mapboxgl.LngLatBounds([firstLng, firstLat], [firstLng, firstLat])
            );

            const map = mapRef.current;
            const verticalOffset = computeVerticalOffset(map, 0.16);

            map.fitBounds(bounds, {
              padding: {
                top: 70,
                bottom: Math.max(160, Math.abs(verticalOffset) * 2),
                left: 40,
                right: 40
              },
              maxZoom: 15,
              duration: 900
            });
          } catch (error) {
            console.error("Error zooming to zone:", error);
          }
        },
        zoomToPin: (pin: Pin) => {
          if (!mapRef.current || !mapLoaded) return;

          try {
            const [lng, lat] = pin.location.coordinates;
            const map = mapRef.current;
            const verticalOffset = computeVerticalOffset(map, 0.25);
            map.flyTo({
              center: [lng, lat],
              zoom: 16,
              duration: 900,
              offset: [0, verticalOffset]
            });
          } catch (error) {
            console.error("Error zooming to pin:", error);
          }
        },
        zoomToLocation: (lng: number, lat: number) => {
          if (!mapRef.current || !mapLoaded) return;
          const map = mapRef.current;
          const verticalOffset = computeVerticalOffset(map, 0.25);
          map.flyTo({
            center: [lng, lat],
            zoom: 14,
            duration: 800,
            offset: [0, verticalOffset]
          });
        }
      }),
      [mapLoaded]
    );

    useEffect(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center,
        zoom: 12,
        ...(maxBounds ? { maxBounds } : {}),
        ...(disableZoom
          ? {
              interactive: false,
              scrollZoom: false,
              boxZoom: false,
              dragRotate: false,
              dragPan: false,
              keyboard: false,
              doubleClickZoom: false,
              touchZoomRotate: false
            }
          : {})
      });

      mapRef.current = map;

      map.on("load", () => {
        setMapLoaded(true);
        if (onViewportChangeRef.current) {
          const bounds = map.getBounds();
          if (bounds) {
            onViewportChangeRef.current(bounds as mapboxgl.LngLatBounds);
          }
        }
      });

      if (onViewportChangeRef.current) {
        const handleViewportChange = () => {
          if (!mapRef.current || !onViewportChangeRef.current) return;
          const bounds = mapRef.current.getBounds();
          if (bounds) {
            onViewportChangeRef.current(bounds as mapboxgl.LngLatBounds);
          }
        };
        map.on("moveend", handleViewportChange);
        map.on("zoomend", handleViewportChange);
        (map as mapboxgl.Map & { _handleViewportChange?: () => void })._handleViewportChange =
          handleViewportChange;
      }

      return () => {
        disposeMarkers();
        if (mapRef.current) {
          const handleViewportChange = (mapRef.current as mapboxgl.Map & {
            _handleViewportChange?: () => void;
          })._handleViewportChange;
          if (handleViewportChange) {
            mapRef.current.off("moveend", handleViewportChange);
            mapRef.current.off("zoomend", handleViewportChange);
          }
        }
        userMarkerRef.current?.remove();
        userMarkerRef.current = null;
        mapRef.current?.remove();
        mapRef.current = null;
        setMapLoaded(false);
      };
    }, [center, disableZoom, disposeMarkers, maxBounds]);

    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      if (maxBounds) {
        mapRef.current.setMaxBounds(maxBounds as mapboxgl.LngLatBoundsLike);
      } else {
        (mapRef.current as mapboxgl.Map & {
          setMaxBounds(bounds: mapboxgl.LngLatBoundsLike | null): void;
        }).setMaxBounds(null);
      }
    }, [mapLoaded, maxBounds]);

    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;
      const map = mapRef.current;

      const zonesGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
        type: "FeatureCollection",
        features: zones.map((zone) => ({
          type: "Feature",
          properties: {
            id: zone.id,
            label: zone.label,
            level: zone.level
          },
          geometry: zone.geom
        }))
      };

      let cleanupZoneClick: (() => void) | undefined;

      const syncZones = () => {
        let styleLoaded = false;
        try {
          styleLoaded = map.isStyleLoaded();
        } catch {
          styleLoaded = false;
        }
        if (!styleLoaded) {
          return false;
        }

        const existingSource = map.getSource(ZONE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;

        if (existingSource) {
          existingSource.setData(zonesGeoJSON);
        } else {
          map.addSource(ZONE_SOURCE_ID, {
            type: "geojson",
            data: zonesGeoJSON
          });

          map.addLayer({
            id: ZONE_FILL_LAYER_ID,
            type: "fill",
            source: ZONE_SOURCE_ID,
            paint: {
              "fill-color": [
                "match",
                ["get", "level"],
                "recommended",
                getZoneColor("recommended"),
                "neutral",
                getZoneColor("neutral"),
                "caution",
                getZoneColor("caution"),
                "avoid",
                getZoneColor("avoid"),
                "#a1a1aa"
              ],
              "fill-opacity": 0.25
            }
          });

          map.addLayer({
            id: ZONE_OUTLINE_LAYER_ID,
            type: "line",
            source: ZONE_SOURCE_ID,
            paint: {
              "line-color": [
                "match",
                ["get", "level"],
                "recommended",
                getZoneColor("recommended"),
                "neutral",
                getZoneColor("neutral"),
                "caution",
                getZoneColor("caution"),
                "avoid",
                getZoneColor("avoid"),
                "#6b7280"
              ],
              "line-width": 2,
              "line-opacity": 0.6
            }
          });

          if (onZoneClickRef.current) {
            const handleZoneClick = (event: mapboxgl.MapLayerMouseEvent) => {
              const feature = event.features?.[0];
              if (!feature?.properties) return;
              const properties = feature.properties as { id?: string } | undefined;
              if (!properties?.id) return;
              const target = zones.find((zone) => zone.id === properties.id);
              if (target) {
                onZoneClickRef.current?.(target);
              }
            };

            map.on("click", ZONE_FILL_LAYER_ID, handleZoneClick);
            cleanupZoneClick = () => map.off("click", ZONE_FILL_LAYER_ID, handleZoneClick);
          }
        }

        return true;
      };

      if (!syncZones()) {
        const handleStyleData = () => {
          if (syncZones()) {
            map.off("styledata", handleStyleData);
          }
        };
        map.on("styledata", handleStyleData);
        return () => {
          map.off("styledata", handleStyleData);
          if (cleanupZoneClick) cleanupZoneClick();
        };
      }

      return () => {
        if (cleanupZoneClick) cleanupZoneClick();
        let styleLoaded = false;
        try {
          styleLoaded = map.isStyleLoaded();
        } catch {
          styleLoaded = false;
        }
        if (!styleLoaded) return;
        try {
          if (map.getLayer(ZONE_OUTLINE_LAYER_ID)) map.removeLayer(ZONE_OUTLINE_LAYER_ID);
          if (map.getLayer(ZONE_FILL_LAYER_ID)) map.removeLayer(ZONE_FILL_LAYER_ID);
          if (map.getSource(ZONE_SOURCE_ID)) map.removeSource(ZONE_SOURCE_ID);
        } catch {
          // ignore
        }
      };
    }, [mapLoaded, zones]);

    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      disposeMarkers();

      const map = mapRef.current;

      pins.forEach((pin) => {
        if (!pin.location?.coordinates?.length) return;
        const [lng, lat] = pin.location.coordinates;
        if (
          typeof lng !== "number" ||
          typeof lat !== "number" ||
          Number.isNaN(lng) ||
          Number.isNaN(lat)
        ) {
          return;
        }

        const markerElement = createMarkerElement(pin);
        markerElement.setAttribute("aria-label", pin.title ?? "Parking location");
        markerElement.addEventListener("click", (event) => {
          event.stopPropagation();
          onPinClickRef.current?.(pin);
        });

        const marker = new mapboxgl.Marker({ element: markerElement, anchor: "bottom" })
          .setLngLat([lng, lat])
          .addTo(map);

        markersRef.current[pin.id] = marker;
      });
    }, [disposeMarkers, mapLoaded, pins]);

    useEffect(() => {
      if (!mapRef.current || !mapLoaded) return;

      if (!userLocation) {
        userMarkerRef.current?.remove();
        userMarkerRef.current = null;
        return;
      }

      if (!userMarkerRef.current) {
        const el = document.createElement("div");
        el.className =
          "flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-sky-400 shadow-md shadow-slate-900/60";
        userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" });
      }

      userMarkerRef.current
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(mapRef.current);

    try {
      const map = mapRef.current;
      if (map) {
        const targetZoom = Math.max(map.getZoom(), 13);
        const verticalOffset = computeVerticalOffset(map, 0.25);
        map.easeTo({
          center: [userLocation.longitude, userLocation.latitude],
          zoom: targetZoom,
          duration: 800,
          offset: [0, verticalOffset]
        });
      }
    } catch {
      // ignore animation failures
    }
    }, [mapLoaded, userLocation]);

    return (
      <div
        ref={mapContainerRef}
        className={`relative h-full w-full ${className}`}
        style={{ minHeight: "400px" }}
      />
    );
  }
);

MapViewComponent.displayName = "MapView";

export default memo(MapViewComponent);

