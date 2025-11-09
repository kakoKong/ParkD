"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type mapboxgl from "mapbox-gl";
function hasMeaningfulShift(previous: Coordinates, next: Coordinates, epsilon = 0.00001) {
  return (
    Math.abs(previous.lat - next.lat) > epsilon || Math.abs(previous.lng - next.lng) > epsilon
  );
}

import Link from "next/link";

import MapView from "@/components/MapView";
import { ParkingSearchForm, type ParkingSearchConfig } from "@/components/ParkingSearchForm";
import { SelectedLotDetails } from "@/components/SelectedLotDetails";
import type { ParkingLot, PricingBreakdown } from "@/types/parking";
import type { MapViewRef, Pin, Zone } from "@/types/map";

type Coordinates = {
  lat: number;
  lng: number;
};

type RankedResult = {
  result: PricingBreakdown;
  lot: ParkingLot;
  distanceKm: number | null;
};

type PageLanguage = "en" | "th";

type PageCopy = {
  brand: string;
  status: {
    locating: string;
    ready: string;
    browse: string;
  };
  searchPanel: {
    title: string;
    expandAria: string;
    collapseAria: string;
    locating: string;
    adjust: string;
    refreshing: string;
    originMap: string;
    originUser: string;
    results: (count: number) => string;
  };
  nav: {
    quickActions: string;
    request: {
      title: string;
      description: string;
    };
    report: {
      title: string;
      description: string;
    };
    support: {
      title: string;
      description: string;
    };
    language: {
      heading: string;
      description: string;
      english: string;
      thai: string;
      currentLabel: string;
    };
  };
  detailModal: {
    title: string;
    done: string;
  };
  carousel: {
    prev: string;
    next: string;
  };
  recenter: {
    label: string;
    aria: string;
  };
  navButtonAria: string;
};

const PAGE_COPY: Record<PageLanguage, PageCopy> = {
  en: {
    brand: "ParkD",
    status: {
      locating: "Locating…",
      ready: "Ready near you",
      browse: "Browse map area"
    },
    searchPanel: {
      title: "Parking search",
      expandAria: "Expand search panel",
      collapseAria: "Collapse search panel",
      locating: "Locating you…",
      adjust: "Adjust search",
      refreshing: "Refreshing parking availability…",
      originMap: "Map area",
      originUser: "Near you",
      results: (count: number) => `${count} result${count === 1 ? "" : "s"}`
    },
    nav: {
      quickActions: "Quick actions",
      request: {
        title: "Request a parking lot",
        description: "Tell us where you need new parking coverage."
      },
      report: {
        title: "Report a parking issue",
        description: "Flag inaccurate rates, closures, or other problems."
      },
      support: {
        title: "Contact support",
        description: "Reach our team for help while you're on the road."
      },
      language: {
        heading: "Language",
        description: "Choose a language for the app experience.",
        english: "English",
        thai: "Thai",
        currentLabel: "Selected"
      }
    },
    detailModal: {
      title: "Parking details",
      done: "Done"
    },
    carousel: {
      prev: "Prev",
      next: "Next"
    },
    recenter: {
      label: "GPS",
      aria: "Re-center map on my location"
    },
    navButtonAria: "Open navigation"
  },
  th: {
    brand: "ParkD",
    status: {
      locating: "กำลังค้นหาตำแหน่ง…",
      ready: "พร้อมให้บริการใกล้คุณ",
      browse: "สำรวจพื้นที่บนแผนที่"
    },
    searchPanel: {
      title: "ค้นหาที่จอดรถ",
      expandAria: "ขยายแผงค้นหา",
      collapseAria: "ย่อแผงค้นหา",
      locating: "กำลังระบุตำแหน่งของคุณ…",
      adjust: "ปรับการค้นหา",
      refreshing: "กำลังรีเฟรชข้อมูลที่จอดรถ…",
      originMap: "พื้นที่บนแผนที่",
      originUser: "ใกล้คุณ",
      results: (count: number) => `${count} ผลลัพธ์`
    },
    nav: {
      quickActions: "การดำเนินการด่วน",
      request: {
        title: "ขอเพิ่มพื้นที่จอดรถ",
        description: "แจ้งให้เราทราบว่าคุณต้องการพื้นที่จอดรถใหม่ที่ไหน"
      },
      report: {
        title: "รายงานปัญหาที่จอดรถ",
        description: "แจ้งอัตราค่าจอดที่ไม่ถูกต้อง การปิดให้บริการ หรือปัญหาอื่นๆ"
      },
      support: {
        title: "ติดต่อฝ่ายสนับสนุน",
        description: "ติดต่อทีมงานเพื่อขอความช่วยเหลือระหว่างการเดินทาง"
      },
      language: {
        heading: "ภาษา",
        description: "เลือกภาษาในการใช้งานแอป",
        english: "ภาษาอังกฤษ",
        thai: "ภาษาไทย",
        currentLabel: "กำลังใช้งาน"
      }
    },
    detailModal: {
      title: "รายละเอียดที่จอดรถ",
      done: "เสร็จสิ้น"
    },
    carousel: {
      prev: "ย้อนกลับ",
      next: "ถัดไป"
    },
    recenter: {
      label: "ตำแหน่งฉัน",
      aria: "นำแผนที่กลับไปยังตำแหน่งของฉัน"
    },
    navButtonAria: "เปิดเมนูนำทาง"
  }
};

const DEFAULT_DURATION_MINUTES = 120;

const QUALIFIER_LABELS: Record<PageLanguage, Record<string, string>> = {
  en: {
    movie: "Movie ticket",
    dining: "Dining receipt",
    grocery: "Grocery loyalty"
  },
  th: {
    movie: "ตั๋วหนัง",
    dining: "ใบเสร็จร้านอาหาร",
    grocery: "สะสมแต้มซูเปอร์มาร์เก็ต"
  }
};

function formatDurationSummary(minutes: number, language: PageLanguage) {
  if (minutes <= 0) {
    return language === "th" ? "ตั้งค่าระยะเวลา" : "Set duration";
  }
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    if (language === "th") {
      return `${hours.toString()} ชม.`;
    }
    return `${hours} hr${hours === 1 ? "" : "s"}`;
  }
  const hours = minutes / 60;
  if (language === "th") {
    return `${hours.toFixed(1)} ชม.`;
  }
  return `${hours.toFixed(1)} hrs`;
}

const LANGUAGE_DISPLAY_LABELS: Record<PageLanguage, string> = {
  en: "English",
  th: "ภาษาไทย"
};

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(origin: Coordinates, target: Coordinates) {
  const R = 6371;
  const dLat = toRadians(target.lat - origin.lat);
  const dLng = toRadians(target.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(target.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

const MAX_VISIBLE_PINS = 5;

export default function HomePage() {
  const mapRef = useRef<MapViewRef>(null);
  const hasCenteredOnUserRef = useRef(false);

  const [results, setResults] = useState<PricingBreakdown[]>([]);
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLots, setIsLoadingLots] = useState(false);
  const [lotsError, setLotsError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const emptyZones = useMemo<Zone[]>(() => [], []);
  const defaultCenter = useMemo<[number, number]>(() => [100.5018, 13.7563], []);
  const [viewportCenter, setViewportCenter] = useState<Coordinates>(() => ({
    lat: defaultCenter[1],
    lng: defaultCenter[0]
  }));
  const [useViewportOrigin, setUseViewportOrigin] = useState(false);
  const shouldSnapToSelectionRef = useRef(false);
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [language, setLanguage] = useState<PageLanguage>("th");
  const [searchConfig, setSearchConfig] = useState<ParkingSearchConfig>({
    durationMinutes: DEFAULT_DURATION_MINUTES,
    spend: 0,
    qualifiers: []
  });
  const isProgrammaticPanRef = useRef(false);
  const copy = PAGE_COPY[language];

  useEffect(() => {
    let cancelled = false;

    async function loadLots() {
      setIsLoadingLots(true);
      setLotsError(null);

      try {
        const response = await fetch("/api/parking/lots");
        if (!response.ok) {
          throw new Error("Unable to fetch parking lots");
        }
        const payload = (await response.json()) as { data?: ParkingLot[] };
        if (cancelled) return;
        setLots(payload.data ?? []);
      } catch (error) {
        if (cancelled) return;
        setLotsError(error instanceof Error ? error.message : "Failed to load parking lots");
      } finally {
        if (!cancelled) {
          setIsLoadingLots(false);
        }
      }
    }

    loadLots();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleUseLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported in this browser.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
      },
      (error) => {
        setLocationError(error.message || "Unable to determine your location.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    handleUseLocation();
  }, [handleUseLocation]);

  useEffect(() => {
    if (!isDetailModalOpen && !isNavOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isDetailModalOpen, isNavOpen]);

  const lotMap = useMemo(() => {
    const map = new Map<string, ParkingLot>();
    lots.forEach((lot) => map.set(lot.id, lot));
    return map;
  }, [lots]);

  const searchOrigin = useMemo<Coordinates | null>(() => {
    if (useViewportOrigin) {
      return viewportCenter;
    }
    return userLocation ?? viewportCenter;
  }, [useViewportOrigin, viewportCenter, userLocation]);

  const rankedResults = useMemo<RankedResult[]>(() => {
    if (!results.length) return [];

    return results
      .map((result) => {
        const lot = lotMap.get(result.lotId);
        if (!lot) return null;

        const distanceKm =
          searchOrigin != null
            ? calculateDistanceKm(searchOrigin, {
                lat: lot.coordinates.lat,
                lng: lot.coordinates.lng
              })
            : null;

        return { result, lot, distanceKm };
      })
      .filter((entry): entry is RankedResult => entry !== null)
      .filter((entry) => {
        if (entry.distanceKm == null) return true;
        return entry.distanceKm <= 10;
      })
      .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [results, lotMap, searchOrigin]);

  useEffect(() => {
    if (!rankedResults.length) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((prev) => Math.min(prev, rankedResults.length - 1));
  }, [rankedResults.length]);

  useEffect(() => {
    if (!userLocation || !rankedResults.length) {
      return;
    }
    setCurrentIndex(0);
  }, [userLocation, rankedResults.length]);

  const activeEntry = rankedResults[currentIndex] ?? null;
  const activeLotId = activeEntry?.lot.id ?? null;

  useEffect(() => {
    if (!activeEntry) {
      setIsDetailModalOpen(false);
    }
  }, [activeEntry]);

  const displayedLotIds = useMemo(() => {
    const ids = new Set<string>();
    rankedResults.slice(0, MAX_VISIBLE_PINS).forEach((entry) => ids.add(entry.lot.id));
    if (activeLotId) {
      ids.add(activeLotId);
    }
    return ids;
  }, [rankedResults, activeLotId]);

  const pins = useMemo<Pin[]>(() => {
    const sourceLots = displayedLotIds.size
      ? lots.filter((lot) => displayedLotIds.has(lot.id))
      : activeEntry
      ? [activeEntry.lot]
      : [];

    return sourceLots.map((lot) => ({
      id: lot.id,
      type: "other",
      title: lot.name,
      summary: lot.address,
      location: {
        type: "Point",
        coordinates: [lot.coordinates.lng, lot.coordinates.lat]
      },
      source: "system",
      imageUrl: lot.imageUrl ?? null
    }));
  }, [displayedLotIds, lots, activeEntry]);

  useEffect(() => {
    if (!userLocation || hasCenteredOnUserRef.current) return;
    isProgrammaticPanRef.current = true;
    mapRef.current?.zoomToLocation(userLocation.lng, userLocation.lat);
    hasCenteredOnUserRef.current = true;
  }, [userLocation]);

  useEffect(() => {
    if (!activeEntry) return;
    const shouldSnap = !useViewportOrigin || shouldSnapToSelectionRef.current;
    if (!shouldSnap) return;

    isProgrammaticPanRef.current = true;
    mapRef.current?.zoomToPin({
      id: activeEntry.lot.id,
      type: "other",
      title: activeEntry.lot.name,
      summary: activeEntry.lot.address,
      source: "system",
      location: {
        type: "Point",
        coordinates: [activeEntry.lot.coordinates.lng, activeEntry.lot.coordinates.lat]
      },
      imageUrl: activeEntry.lot.imageUrl ?? null
    });
    shouldSnapToSelectionRef.current = false;
  }, [activeEntry, useViewportOrigin]);

  const handleResults = useCallback((nextResults: PricingBreakdown[]) => {
    setResults(nextResults);
    setCurrentIndex(0);
    shouldSnapToSelectionRef.current = true;
    setIsSearchCollapsed(true);
    setIsDetailModalOpen(false);
  }, []);

  const handleSelectLot = useCallback(
    (lotId: string) => {
      shouldSnapToSelectionRef.current = true;
      const nextIndex = rankedResults.findIndex((entry) => entry.lot.id === lotId);
      if (nextIndex !== -1) {
        setCurrentIndex(nextIndex);
        const targetLot = rankedResults[nextIndex]?.lot ?? lotMap.get(lotId);
        if (targetLot) {
          isProgrammaticPanRef.current = true;
          mapRef.current?.zoomToPin({
            id: targetLot.id,
            type: "other",
            title: targetLot.name,
            summary: targetLot.address,
            source: "system",
            location: {
              type: "Point",
              coordinates: [targetLot.coordinates.lng, targetLot.coordinates.lat]
            },
            imageUrl: targetLot.imageUrl ?? null
          });
        }
      }
    },
    [rankedResults, lotMap]
  );

  const handleRecenter = useCallback(() => {
    if (!userLocation) return;
    setUseViewportOrigin(false);
    shouldSnapToSelectionRef.current = true;
    isProgrammaticPanRef.current = true;
    mapRef.current?.zoomToLocation(userLocation.lng, userLocation.lat);
  }, [userLocation]);

  const totalResults = rankedResults.length;

  const handleNext = useCallback(() => {
    if (totalResults <= 1) return;
    shouldSnapToSelectionRef.current = true;
    setCurrentIndex((prev) => (prev + 1) % totalResults);
  }, [totalResults]);

  const handlePrev = useCallback(() => {
    if (totalResults <= 1) return;
    shouldSnapToSelectionRef.current = true;
    setCurrentIndex((prev) => (prev - 1 + totalResults) % totalResults);
  }, [totalResults]);

  const openDetailModal = useCallback(() => {
    if (!activeEntry) return;
    setIsDetailModalOpen(true);
    setIsNavOpen(false);
  }, [activeEntry]);

  const closeDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
  }, []);

  const closeNav = useCallback(() => {
    setIsNavOpen(false);
  }, []);

  const hasResults = totalResults > 0;

  const handleViewportChange = useCallback(
    (bounds: mapboxgl.LngLatBounds) => {
      const center = bounds.getCenter();
      const nextCenter = { lat: center.lat, lng: center.lng };
      setViewportCenter((prev) => (hasMeaningfulShift(prev, nextCenter) ? nextCenter : prev));

      if (isProgrammaticPanRef.current) {
        isProgrammaticPanRef.current = false;
        return;
      }

      if (userLocation) {
        const distanceFromUser = calculateDistanceKm(userLocation, nextCenter);
        const shouldUseViewport = distanceFromUser > 0.3;
        setUseViewportOrigin((prev) => (prev === shouldUseViewport ? prev : shouldUseViewport));
      } else {
        setUseViewportOrigin(true);
      }

      shouldSnapToSelectionRef.current = false;
    },
    [userLocation]
  );

  const mapUserLocation = useMemo(() => {
    if (!userLocation) return null;
    return { latitude: userLocation.lat, longitude: userLocation.lng };
  }, [userLocation]);

  const statusMessage = locationError
    ? locationError
    : isLocating && !userLocation
    ? copy.status.locating
    : userLocation
    ? copy.status.ready
    : copy.status.browse;

  const spendLabel =
    language === "th"
      ? `${searchConfig.spend.toLocaleString("th-TH")} บาท`
      : `${searchConfig.spend.toLocaleString("en-US")} THB`;
  const configSummaryParts = [
    formatDurationSummary(searchConfig.durationMinutes, language),
    spendLabel
  ];
  if (searchConfig.qualifiers.length) {
    const qualifierSummary = searchConfig.qualifiers
      .map((qualifier) => QUALIFIER_LABELS[language][qualifier] ?? qualifier)
      .join(", ");
    if (qualifierSummary) {
      configSummaryParts.push(qualifierSummary);
    }
  }
  const searchSummaryLabel = configSummaryParts.join(" · ");

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-950 text-slate-100">
      <MapView
        ref={mapRef}
        zones={emptyZones}
        pins={pins}
        center={defaultCenter}
        userLocation={mapUserLocation}
        onPinClick={(pin) => handleSelectLot(pin.id)}
        onViewportChange={handleViewportChange}
        disableZoom={false}
        className="h-full w-full"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-5">
        <div className="pointer-events-auto rounded-full bg-slate-950/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-300 shadow-lg shadow-slate-950/40 backdrop-blur">
          {copy.brand}
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="rounded-full bg-slate-950/70 px-3 py-2 text-[11px] text-slate-400 shadow">
            {statusMessage}
          </div>
          <button
            type="button"
            onClick={() => {
              setIsNavOpen(true);
              setIsDetailModalOpen(false);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-950/85 text-lg font-semibold text-slate-100 shadow-lg shadow-slate-950/40 transition hover:bg-slate-900"
            aria-label={copy.navButtonAria}
          >
            ☰
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleRecenter}
        disabled={!userLocation}
        className="pointer-events-auto absolute bottom-36 right-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-950/85 text-xs font-semibold text-slate-100 shadow-lg shadow-slate-950/50 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={copy.recenter.aria}
      >
        {copy.recenter.label}
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-6">
        <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col gap-4">
          <div className="rounded-3xl border border-slate-800/60 bg-slate-950/85 px-5 py-4 shadow-xl shadow-slate-950/60 backdrop-blur">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-slate-400">
              <span>{copy.searchPanel.title}</span>
              <button
                type="button"
                onClick={() => setIsSearchCollapsed((prev) => !prev)}
                className="rounded-full bg-slate-900/70 px-3 py-1 text-slate-300 transition hover:bg-slate-800"
                aria-label={isSearchCollapsed ? copy.searchPanel.expandAria : copy.searchPanel.collapseAria}
              >
                <span aria-hidden="true">{isSearchCollapsed ? "＋" : "−"}</span>
                <span className="sr-only">
                  {isSearchCollapsed ? copy.searchPanel.expandAria : copy.searchPanel.collapseAria}
                </span>
              </button>
            </div>
            <div className="mt-2 text-[10px] text-slate-500">
              {isLocating && !userLocation ? copy.searchPanel.locating : null}
              {locationError ? locationError : null}
            </div>
            <div className="mt-4 space-y-4">
              <div
                className={`space-y-2 text-[11px] text-slate-400 ${
                  isSearchCollapsed ? "block" : "hidden"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-900/70 px-3 py-1 text-slate-200">
                    {useViewportOrigin ? copy.searchPanel.originMap : copy.searchPanel.originUser}
                  </span>
                  <span className="rounded-full bg-slate-900/50 px-3 py-1 text-slate-300">
                    {searchSummaryLabel}
                  </span>
                </div>
                {isLoadingLots ? (
                  <p className="text-[10px] text-slate-500">{copy.searchPanel.refreshing}</p>
                ) : null}
                {lotsError ? (
                  <p className="rounded-full border border-red-500/40 bg-red-500/15 px-3 py-1 text-red-200">
                    {lotsError}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsSearchCollapsed(false)}
                  className="inline-flex items-center gap-2 rounded-full bg-sky-500/90 px-4 py-2 text-[11px] font-semibold text-slate-950 transition hover:bg-sky-400"
                >
                  {copy.searchPanel.adjust}
                </button>
              </div>

              <div className={isSearchCollapsed ? "hidden" : "space-y-4"} aria-hidden={isSearchCollapsed}>
                <ParkingSearchForm
                  variant="compact"
                  onResults={handleResults}
                  autoCollapseStayLength={hasResults}
                  language={language}
                  config={searchConfig}
                  onConfigChange={setSearchConfig}
                />
                {lotsError ? (
                  <div className="rounded-2xl border border-red-500/40 bg-red-500/15 px-4 py-3 text-xs text-red-200">
                    {lotsError}
                  </div>
                ) : null}
                {isLoadingLots ? (
                  <p className="text-center text-[11px] text-slate-400">
                    {copy.searchPanel.refreshing}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <SelectedLotDetails
            lot={activeEntry?.lot}
            pricing={activeEntry?.result}
            distanceKm={activeEntry?.distanceKm}
            variant="compact"
            onOpenDetail={activeEntry ? openDetailModal : undefined}
            language={language}
          />

          {totalResults > 1 ? (
            <div className="flex items-center justify-between rounded-full border border-slate-800/70 bg-slate-950/80 px-4 py-2 text-[11px] text-slate-300 shadow">
              <button
                type="button"
                onClick={handlePrev}
                className="rounded-full bg-slate-900/80 px-3 py-1 font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                {copy.carousel.prev}
              </button>
              <span className="font-semibold text-slate-100">
                {currentIndex + 1}/{totalResults}
              </span>
              <button
                type="button"
                onClick={handleNext}
                className="rounded-full bg-slate-900/80 px-3 py-1 font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                {copy.carousel.next}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {isDetailModalOpen && activeEntry ? (
        <div className="pointer-events-auto fixed inset-0 z-40 flex flex-col justify-end sm:items-center sm:justify-center">
          <div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={closeDetailModal}
          />
          <div
            className="relative z-10 w-full max-w-lg translate-y-0 rounded-t-3xl border border-slate-800/70 bg-slate-950/95 px-5 pb-6 pt-6 shadow-2xl shadow-slate-950/60 sm:rounded-3xl sm:p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeDetailModal}
              className="absolute right-5 top-5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/60 bg-slate-900/70 text-lg font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
              aria-label="Close parking details"
            >
              ×
            </button>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
              {copy.detailModal.title}
            </h2>
            <SelectedLotDetails
              lot={activeEntry.lot}
              pricing={activeEntry.result}
              distanceKm={activeEntry.distanceKm}
              variant="default"
              language={language}
            />
            <button
              type="button"
              onClick={closeDetailModal}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-sky-500/90 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              {copy.detailModal.done}
            </button>
          </div>
        </div>
      ) : null}

      {isNavOpen ? (
        <div className="pointer-events-auto fixed inset-0 z-30 flex justify-end sm:justify-center">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={closeNav}
          />
          <div
            className="relative z-10 mt-20 w-full max-w-sm overflow-hidden rounded-l-3xl border border-slate-800/70 bg-slate-950/95 shadow-2xl shadow-slate-950/60 sm:mt-24 sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800/60 px-6 py-4">
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                {copy.nav.quickActions}
              </span>
              <button
                type="button"
                onClick={closeNav}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/60 bg-slate-900/80 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
                aria-label="Close navigation"
              >
                ×
              </button>
            </div>
            <nav className="space-y-3 px-6 py-5 text-sm text-slate-200">
              <Link
                href="#request-parking"
                onClick={closeNav}
                className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 transition hover:border-slate-600 hover:bg-slate-900"
              >
                <div>
                  <p className="font-semibold">{copy.nav.request.title}</p>
                  <p className="text-xs text-slate-400">{copy.nav.request.description}</p>
                </div>
                <span aria-hidden="true" className="text-lg text-slate-500">
                  →
                </span>
              </Link>
              <Link
                href="#report-parking"
                onClick={closeNav}
                className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 transition hover:border-slate-600 hover:bg-slate-900"
              >
                <div>
                  <p className="font-semibold">{copy.nav.report.title}</p>
                  <p className="text-xs text-slate-400">{copy.nav.report.description}</p>
                </div>
                <span aria-hidden="true" className="text-lg text-slate-500">
                  →
                </span>
              </Link>
              <Link
                href="mailto:hello@parkd.app?subject=Parking%20support"
                className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 transition hover:border-slate-600 hover:bg-slate-900"
              >
                <div>
                  <p className="font-semibold">{copy.nav.support.title}</p>
                  <p className="text-xs text-slate-400">{copy.nav.support.description}</p>
                </div>
                <span aria-hidden="true" className="text-lg text-slate-500">
                  →
                </span>
              </Link>
            </nav>
            <div className="border-t border-slate-800/60 bg-slate-950/80">
              <div className="border-b border-slate-800/60 px-6 py-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  {copy.nav.language.heading}
                </span>
              </div>
              <div className="space-y-3 px-6 py-4 text-sm text-slate-200">
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    aria-pressed={language === "en"}
                    className={[
                      "flex items-center justify-between rounded-2xl border px-4 py-2 transition",
                      language === "en"
                        ? "border-sky-500/70 bg-sky-500/20 text-sky-100"
                        : "border-slate-800/70 bg-slate-900/50 text-slate-200 hover:border-slate-600 hover:bg-slate-900"
                    ].join(" ")}
                  >
                    <span>{LANGUAGE_DISPLAY_LABELS.en}</span>
                    {language === "en" ? (
                      <span className="text-[11px] uppercase tracking-[0.28em] text-slate-300">
                        {PAGE_COPY.en.nav.language.currentLabel}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("th")}
                    aria-pressed={language === "th"}
                    className={[
                      "flex items-center justify-between rounded-2xl border px-4 py-2 transition",
                      language === "th"
                        ? "border-sky-500/70 bg-sky-500/20 text-sky-100"
                        : "border-slate-800/70 bg-slate-900/50 text-slate-200 hover:border-slate-600 hover:bg-slate-900"
                    ].join(" ")}
                  >
                    <span>{LANGUAGE_DISPLAY_LABELS.th}</span>
                    {language === "th" ? (
                      <span className="text-[11px] uppercase tracking-[0.28em] text-slate-300">
                        {PAGE_COPY.th.nav.language.currentLabel}
                      </span>
                    ) : null}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">{copy.nav.language.description}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
