import 'maplibre-gl/dist/maplibre-gl.css';

import type { Feature, FeatureCollection, Geometry, MultiPolygon, Polygon } from 'geojson';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import MapGL, { Layer, Source } from 'react-map-gl/maplibre';
import * as topojson from 'topojson-client';

import { WORLD_CITIES } from '@/lib/cities';
import type { DiplomaticRelation, MapTheme, Player, Province } from '@/lib/types';

import Tooltip from './Tooltip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MapViewProps {
  provinces: Province[];
  players: Record<string, Player>;
  onSelectProvince: (provinceId: string | number | null) => void;
  selectedProvinceId: string | number | null;
  theme?: MapTheme;
  relations?: DiplomaticRelation[];
}

// ---------------------------------------------------------------------------
// Theme Styles
// ---------------------------------------------------------------------------

const THEMES: Record<
  MapTheme,
  {
    sea: string;
    land: string;
    border: string;
    selected: string;
    hover: string;
    text: string;
    grid: string;
    playerBorder: string;
    playerGlow: string;
  }
> = {
  classic: {
    sea: '#0a1628',
    land: '#1a2744',
    border: '#2d4a6f',
    selected: '#f59e0b',
    hover: '#475569',
    text: '#d4dce8',
    grid: '#1e293b',
    playerBorder: 'rgba(245,158,11,0.7)',
    playerGlow: 'rgba(245,158,11,0.25)',
  },
  cyberpunk: {
    sea: '#020510',
    land: '#0d1424',
    border: '#06b6d4',
    selected: '#e879f9',
    hover: '#164e63',
    text: '#22d3ee',
    grid: '#0e2433',
    playerBorder: 'rgba(232,121,249,0.7)',
    playerGlow: 'rgba(232,121,249,0.25)',
  },
  parchment: {
    sea: '#8a7a5a',
    land: '#b8a07a',
    border: '#5c4033',
    selected: '#b45309',
    hover: '#a0865a',
    text: '#3f2305',
    grid: '#b8a07a',
    playerBorder: 'rgba(180,83,9,0.7)',
    playerGlow: 'rgba(180,83,9,0.25)',
  },
  blueprint: {
    sea: '#081830',
    land: '#122240',
    border: '#3b82f6',
    selected: '#facc15',
    hover: '#1e3a5f',
    text: '#93c5fd',
    grid: '#1a3050',
    playerBorder: 'rgba(250,204,21,0.7)',
    playerGlow: 'rgba(250,204,21,0.25)',
  },
};

// ---------------------------------------------------------------------------
// Color Utilities
// ---------------------------------------------------------------------------

function parseColor(color: string): [number, number, number] {
  if (!color) return [100, 100, 100];
  const hslMatch = color.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)/i);
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) / 360;
    const s = parseFloat(hslMatch[2]) / 100;
    const l = parseFloat(hslMatch[3]) / 100;
    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
    }
    if (hex.length >= 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
  }
  return [100, 100, 100];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    (
      (1 << 24) |
      (Math.min(255, Math.max(0, r)) << 16) |
      (Math.min(255, Math.max(0, g)) << 8) |
      Math.min(255, Math.max(0, b))
    )
      .toString(16)
      .slice(1)
  );
}

// ---------------------------------------------------------------------------
// Antimeridian Fix: normalize coordinates so polygons crossing 180° longitude
// don't create horizontal line artifacts across the entire map.
// ---------------------------------------------------------------------------

function fixRing(ring: number[][]): number[][] {
  if (ring.length < 2) return ring;
  const result: number[][] = [[ring[0][0], ring[0][1]]];
  for (let i = 1; i < ring.length; i++) {
    let lng = ring[i][0];
    const prevLng = result[i - 1][0];
    if (lng - prevLng > 180) lng -= 360;
    else if (prevLng - lng > 180) lng += 360;
    result.push([lng, ring[i][1]]);
  }
  return result;
}

function fixGeometry(geom: Geometry): Geometry {
  if (geom.type === 'Polygon') {
    return { ...geom, coordinates: (geom as Polygon).coordinates.map(fixRing) };
  }
  if (geom.type === 'MultiPolygon') {
    return {
      ...geom,
      coordinates: (geom as MultiPolygon).coordinates.map((poly) => poly.map(fixRing)),
    };
  }
  return geom;
}

// ---------------------------------------------------------------------------
// GeoJSON Builders
// ---------------------------------------------------------------------------

function computeFillColor(
  p: Province,
  players: Record<string, Player>,
  landRgb: [number, number, number]
): string {
  if (p.ownerId && players[p.ownerId]) {
    const ownerRgb = parseColor(players[p.ownerId].color);
    // Boost saturation/brightness for owned territories
    const isPlayer = p.ownerId === 'player';
    const boost = isPlayer ? 1.2 : 1.05;
    return rgbToHex(
      Math.round(ownerRgb[0] * boost),
      Math.round(ownerRgb[1] * boost),
      Math.round(ownerRgb[2] * boost)
    );
  }
  // Neutral: land base color tinted with province color
  const raw = parseColor(p.color);
  return rgbToHex(
    Math.round(landRgb[0] * 0.6 + raw[0] * 0.25 + 15),
    Math.round(landRgb[1] * 0.6 + raw[1] * 0.25 + 15),
    Math.round(landRgb[2] * 0.6 + raw[2] * 0.25 + 18)
  );
}

function buildTier2GeoJSON(
  provinces: Province[],
  players: Record<string, Player>,
  landColor: string
): FeatureCollection {
  const landRgb = parseColor(landColor);
  const features: Feature[] = provinces.map((p) => ({
    type: 'Feature' as const,
    id: typeof p.id === 'number' ? p.id : undefined,
    geometry: fixGeometry(p.feature?.geometry || { type: 'Point', coordinates: [0, 0] }),
    properties: {
      id: String(p.id),
      name: p.name,
      ownerId: p.ownerId || '',
      fillColor: computeFillColor(p, players, landRgb),
      parentCountryId: p.parentCountryId || String(p.id),
      isSubNational: p.isSubNational ? 1 : 0,
      isPlayer: p.ownerId === 'player' ? 1 : 0,
      population: p.resources.population,
      defense: p.resources.defense,
      economy: p.resources.economy,
      technology: p.resources.technology,
    },
  }));
  return { type: 'FeatureCollection', features };
}

function buildTier1GeoJSON(
  provinces: Province[],
  players: Record<string, Player>,
  landColor: string
): FeatureCollection {
  type CountryEntry = {
    polygons: number[][][][];
    ownerId: string | null;
    allSameOwner: boolean;
    name: string;
    population: number;
    isPlayer: boolean;
  };
  const countryMap: globalThis.Map<string, CountryEntry> = new globalThis.Map();
  const landRgb = parseColor(landColor);

  for (const p of provinces) {
    const cid = p.parentCountryId || String(p.id);
    let entry = countryMap.get(cid);
    if (!entry) {
      entry = {
        polygons: [],
        ownerId: p.ownerId,
        allSameOwner: true,
        name: p.parentCountryName || p.name,
        population: 0,
        isPlayer: p.ownerId === 'player',
      };
      countryMap.set(cid, entry);
    }
    if (entry.ownerId !== p.ownerId) entry.allSameOwner = false;
    if (p.ownerId === 'player') entry.isPlayer = true;
    entry.population += p.resources.population;

    const geom = p.feature?.geometry;
    if (geom) {
      if (geom.type === 'Polygon') entry.polygons.push(geom.coordinates);
      else if (geom.type === 'MultiPolygon') entry.polygons.push(...geom.coordinates);
    }
  }

  const features: Feature[] = [];
  for (const [cid, entry] of countryMap) {
    if (entry.polygons.length === 0) continue;

    let fillColor: string;
    if (entry.allSameOwner && entry.ownerId && players[entry.ownerId]) {
      const ownerRgb = parseColor(players[entry.ownerId].color);
      const boost = entry.ownerId === 'player' ? 1.2 : 1.05;
      fillColor = rgbToHex(
        Math.round(ownerRgb[0] * boost),
        Math.round(ownerRgb[1] * boost),
        Math.round(ownerRgb[2] * boost)
      );
    } else if (!entry.allSameOwner) {
      // Mixed ownership: blend
      fillColor = rgbToHex(
        Math.round(landRgb[0] + 40),
        Math.round(landRgb[1] + 40),
        Math.round(landRgb[2] + 45)
      );
    } else {
      fillColor = rgbToHex(
        Math.round(landRgb[0] + 20),
        Math.round(landRgb[1] + 20),
        Math.round(landRgb[2] + 25)
      );
    }

    const geometry: Geometry = fixGeometry(
      entry.polygons.length === 1
        ? { type: 'Polygon', coordinates: entry.polygons[0] }
        : { type: 'MultiPolygon', coordinates: entry.polygons }
    );

    features.push({
      type: 'Feature',
      geometry,
      properties: {
        id: cid,
        name: entry.name,
        fillColor,
        population: entry.population,
        isPlayer: entry.isPlayer ? 1 : 0,
      },
    });
  }
  return { type: 'FeatureCollection', features };
}

function buildCitiesGeoJSON(): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: WORLD_CITIES.map((city) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [city.lon, city.lat] },
      properties: { name: city.name, tier: city.tier },
    })),
  };
}

function buildRelationBorderGeoJSON(provinces: Province[], pairs: Set<string>): FeatureCollection {
  if (pairs.size === 0) return { type: 'FeatureCollection', features: [] };
  const features: Feature[] = [];
  for (const p of provinces) {
    if (!p.ownerId) continue;
    let hasBorder = false;
    for (const nId of p.neighbors) {
      const neighbor = provinces.find((np) => np.id === nId);
      if (
        neighbor?.ownerId &&
        neighbor.ownerId !== p.ownerId &&
        pairs.has(`${p.ownerId}|${neighbor.ownerId}`)
      ) {
        hasBorder = true;
        break;
      }
    }
    if (hasBorder && p.feature?.geometry) {
      features.push({
        type: 'Feature',
        geometry: fixGeometry(p.feature.geometry),
        properties: { id: String(p.id) },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

// Build a GeoJSON of all player-owned province outlines
function buildPlayerTerritoryGeoJSON(provinces: Province[]): FeatureCollection {
  const features: Feature[] = [];
  for (const p of provinces) {
    if (p.ownerId !== 'player') continue;
    if (!p.feature?.geometry) continue;
    features.push({
      type: 'Feature',
      geometry: fixGeometry(p.feature.geometry),
      properties: { id: String(p.id) },
    });
  }
  return { type: 'FeatureCollection', features };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MapView({
  provinces,
  players,
  onSelectProvince,
  selectedProvinceId,
  theme = 'classic',
  relations = [],
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const th = THEMES[theme];

  const [tooltipData, setTooltipData] = useState<{
    province: Province | null;
    owner?: Player;
    position: { x: number; y: number };
  } | null>(null);

  const hoveredIdRef = useRef<string | null>(null);
  const [warOpacity, setWarOpacity] = useState(0.6);
  const [mapReady, setMapReady] = useState(false);
  const warAnimRef = useRef<number>(0);
  const didInitialZoomRef = useRef(false);

  // Tier 3 lazy loading
  const [tier3GeoJSON, setTier3GeoJSON] = useState<FeatureCollection | null>(null);
  const [, setTier3Status] = useState<'idle' | 'loading' | 'error'>('idle');
  const tier3LoadedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Build relation pair sets
  // ---------------------------------------------------------------------------

  const warPairs = useMemo(() => {
    const pairs = new Set<string>();
    for (const rel of relations) {
      if (rel.type === 'war') {
        pairs.add(`${rel.nationA}|${rel.nationB}`);
        pairs.add(`${rel.nationB}|${rel.nationA}`);
      }
    }
    return pairs;
  }, [relations]);

  const hostilePairs = useMemo(() => {
    const pairs = new Set<string>();
    for (const rel of relations) {
      if (rel.type === 'hostile') {
        pairs.add(`${rel.nationA}|${rel.nationB}`);
        pairs.add(`${rel.nationB}|${rel.nationA}`);
      }
    }
    return pairs;
  }, [relations]);

  const alliedPairs = useMemo(() => {
    const pairs = new Set<string>();
    for (const rel of relations) {
      if (rel.type === 'allied') {
        pairs.add(`${rel.nationA}|${rel.nationB}`);
        pairs.add(`${rel.nationB}|${rel.nationA}`);
      }
    }
    return pairs;
  }, [relations]);

  // ---------------------------------------------------------------------------
  // Build GeoJSON data
  // ---------------------------------------------------------------------------

  const tier2GeoJSON = useMemo(
    () => buildTier2GeoJSON(provinces, players, th.land),
    [provinces, players, th.land]
  );

  const tier1GeoJSON = useMemo(
    () => buildTier1GeoJSON(provinces, players, th.land),
    [provinces, players, th.land]
  );

  const citiesGeoJSON = useMemo(() => buildCitiesGeoJSON(), []);

  // Ocean / sea labels — purely cosmetic, anchored to fixed centroids so
  // the empty blue space reads as an atlas instead of dead pixels.
  const oceansGeoJSON = useMemo<FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: [
        { name: 'PACIFIC OCEAN', coords: [-150, 5] },
        { name: 'ATLANTIC OCEAN', coords: [-30, 10] },
        { name: 'INDIAN OCEAN', coords: [75, -25] },
        { name: 'ARCTIC OCEAN', coords: [0, 78] },
        { name: 'SOUTHERN OCEAN', coords: [30, -65] },
        { name: 'Mediterranean Sea', coords: [18, 36] },
        { name: 'South China Sea', coords: [115, 13] },
        { name: 'Caribbean Sea', coords: [-75, 15] },
      ].map((f) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: f.coords },
        properties: { name: f.name, major: f.name === f.name.toUpperCase() ? 1 : 0 },
      })),
    }),
    []
  );

  const warBorderGeoJSON = useMemo(
    () => buildRelationBorderGeoJSON(provinces, warPairs),
    [provinces, warPairs]
  );

  const hostileBorderGeoJSON = useMemo(
    () => buildRelationBorderGeoJSON(provinces, hostilePairs),
    [provinces, hostilePairs]
  );

  const alliedBorderGeoJSON = useMemo(
    () => buildRelationBorderGeoJSON(provinces, alliedPairs),
    [provinces, alliedPairs]
  );

  const playerTerritoryGeoJSON = useMemo(() => buildPlayerTerritoryGeoJSON(provinces), [provinces]);

  const selectedGeoJSON = useMemo<FeatureCollection>(() => {
    if (selectedProvinceId === null) return { type: 'FeatureCollection', features: [] };
    const selected = provinces.find((pr) => pr.id === selectedProvinceId);
    if (!selected?.feature?.geometry) return { type: 'FeatureCollection', features: [] };
    // Highlight all provinces of the same country for whole-country selection
    const parentId = selected.parentCountryId || String(selected.id);
    const countryProvinces = provinces.filter(
      (p) => (p.parentCountryId || String(p.id)) === parentId && p.feature?.geometry
    );
    return {
      type: 'FeatureCollection',
      features: countryProvinces.map((p) => ({
        type: 'Feature' as const,
        geometry: fixGeometry(p.feature!.geometry),
        properties: { id: String(p.id) },
      })),
    };
  }, [selectedProvinceId, provinces]);

  // ---------------------------------------------------------------------------
  // Tier 3 data: Inherit colors from tier 2
  // ---------------------------------------------------------------------------

  const tier3Colored = useMemo<FeatureCollection | null>(() => {
    if (!tier3GeoJSON) return null;
    const regionColorMap: globalThis.Map<string, string> = new globalThis.Map();
    for (const f of tier2GeoJSON.features) {
      if (f.properties) {
        regionColorMap.set(f.properties.id, f.properties.fillColor);
      }
    }
    const features = tier3GeoJSON.features.map((f) => {
      const regionId = f.properties?.regionId || '';
      const fillColor = regionColorMap.get(regionId) || f.properties?.color || '#334155';
      return { ...f, properties: { ...f.properties, fillColor } };
    });
    return { type: 'FeatureCollection', features };
  }, [tier3GeoJSON, tier2GeoJSON]);

  // ---------------------------------------------------------------------------
  // MapLibre Style
  // ---------------------------------------------------------------------------

  const mapStyle = useMemo(
    () => ({
      version: 8 as const,
      sources: {},
      layers: [
        {
          id: 'background',
          type: 'background' as const,
          paint: { 'background-color': th.land },
        },
      ],
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    }),
    [th.land]
  );

  // ---------------------------------------------------------------------------
  // Map load: enforce single world copy + constrain bounds
  // ---------------------------------------------------------------------------

  const handleMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.setRenderWorldCopies(false);
  }, []);

  // ---------------------------------------------------------------------------
  // War border pulse animation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (warPairs.size === 0 && hostilePairs.size === 0) return;
    let running = true;
    const animate = () => {
      if (!running) return;
      const t = performance.now() * 0.003;
      setWarOpacity(0.4 + Math.sin(t) * 0.3);
      warAnimRef.current = requestAnimationFrame(animate);
    };
    warAnimRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      cancelAnimationFrame(warAnimRef.current);
    };
  }, [warPairs.size, hostilePairs.size]);

  // ---------------------------------------------------------------------------
  // Initial Zoom to Player's Nation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (didInitialZoomRef.current) return;
    if (provinces.length === 0) return;

    const playerProvinces = provinces.filter((p) => p.ownerId === 'player');
    if (playerProvinces.length === 0) return;
    didInitialZoomRef.current = true;

    let minLon = 180,
      maxLon = -180,
      minLat = 90,
      maxLat = -90;
    for (const p of playerProvinces) {
      const [lon, lat] = p.center;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    const padLon = Math.max((maxLon - minLon) * 0.3, 5);
    const padLat = Math.max((maxLat - minLat) * 0.3, 5);

    setTimeout(() => {
      mapRef.current?.fitBounds(
        [
          [minLon - padLon, minLat - padLat],
          [maxLon + padLon, maxLat + padLat],
        ],
        { duration: 1500 }
      );
    }, 300);
  }, [provinces]);

  // Pan to selected province
  useEffect(() => {
    if (selectedProvinceId === null) return;
    const province = provinces.find((p) => p.id === selectedProvinceId);
    if (!province) return;
    mapRef.current?.flyTo({
      center: province.center,
      zoom: Math.max(mapRef.current.getZoom(), 4),
      duration: 800,
    });
  }, [selectedProvinceId, provinces]);

  // ---------------------------------------------------------------------------
  // Lazy load tier 3 data on zoom
  // ---------------------------------------------------------------------------

  const handleZoomEnd = useCallback(() => {
    if (tier3LoadedRef.current) return;
    const zoom = mapRef.current?.getZoom();
    if (zoom && zoom >= 5) {
      tier3LoadedRef.current = true;
      setTier3Status('loading');
      fetch('/admin1-detail.json')
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((topoData) => {
          const geo = topojson.feature(
            topoData,
            topoData.objects.states
          ) as unknown as FeatureCollection;
          setTier3GeoJSON(geo);
          setTier3Status('idle');
        })
        .catch((err) => {
          console.error('Failed to load tier 3 data:', err);
          tier3LoadedRef.current = false;
          setTier3Status('error');
        });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Click handler
  // ---------------------------------------------------------------------------

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const features = event.features;
      if (features && features.length > 0) {
        const clickedId = features[0].properties?.id;
        if (clickedId) {
          if (String(clickedId) === String(selectedProvinceId)) {
            onSelectProvince(null);
            return;
          }
          // For tier 3 clicks, map stateId back to regionId
          const regionId = features[0].properties?.regionId;
          if (regionId && features[0].layer?.id?.startsWith('states-')) {
            const province = provinces.find((p) => String(p.id) === String(regionId));
            if (province) {
              onSelectProvince(province.id);
              return;
            }
          }
          // Direct tier 1/2 click
          const province =
            provinces.find((p) => String(p.id) === String(clickedId)) ||
            provinces.find((p) => (p.parentCountryId || String(p.id)) === String(clickedId));
          if (province) onSelectProvince(province.id);
        }
      } else {
        onSelectProvince(null);
      }
    },
    [onSelectProvince, selectedProvinceId, provinces]
  );

  // ---------------------------------------------------------------------------
  // Hover handler
  // ---------------------------------------------------------------------------

  const handleMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const features = event.features;

      if (hoveredIdRef.current) hoveredIdRef.current = null;

      if (features && features.length > 0) {
        const f = features[0];
        const propId = f.properties?.id;
        if (propId) {
          hoveredIdRef.current = String(propId);
          map.getCanvas().style.cursor = 'pointer';

          // Resolve province for tooltip
          const regionId = f.properties?.regionId;
          const province =
            (regionId && f.layer?.id?.startsWith('states-')
              ? provinces.find((p) => String(p.id) === String(regionId))
              : null) ||
            provinces.find((p) => String(p.id) === String(propId)) ||
            provinces.find((p) => (p.parentCountryId || String(p.id)) === String(propId));

          if (province) {
            const owner = province.ownerId ? players[province.ownerId] : undefined;
            setTooltipData({
              province,
              owner,
              position: { x: event.point.x, y: event.point.y },
            });
          }
        }
      } else {
        map.getCanvas().style.cursor = 'grab';
        setTooltipData(null);
      }
    },
    [provinces, players]
  );

  const handleMouseLeave = useCallback(() => {
    hoveredIdRef.current = null;
    setTooltipData(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Tooltip position (map-local → viewport)
  // ---------------------------------------------------------------------------

  const tooltipScreenPos = useMemo(() => {
    if (!tooltipData) return null;
    // eslint-disable-next-line react-hooks/refs
    const container = mapRef.current?.getMap()?.getContainer();
    if (!container) return tooltipData.position;
    const rect = container.getBoundingClientRect();
    return {
      x: rect.left + tooltipData.position.x,
      y: rect.top + tooltipData.position.y,
    };
  }, [tooltipData]);

  // ---------------------------------------------------------------------------
  // Interactive layer IDs
  // ---------------------------------------------------------------------------

  const interactiveLayerIds = useMemo(() => {
    const ids = ['countries-fill', 'regions-fill'];
    if (tier3Colored) ids.push('states-fill');
    return ids;
  }, [tier3Colored]);

  // ---------------------------------------------------------------------------
  // Province labels GeoJSON
  // ---------------------------------------------------------------------------

  const labelsGeoJSON = useMemo<FeatureCollection>(() => {
    const features: Feature[] = provinces.map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: p.center },
      properties: {
        id: String(p.id),
        name: p.name,
        population: p.resources.population,
        ownerId: p.ownerId || '',
        isPlayer: p.ownerId === 'player' ? 1 : 0,
      },
    }));
    return { type: 'FeatureCollection', features };
  }, [provinces]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const accessibilityLabel = useMemo(() => {
    const playerNames = Object.values(players)
      .map((p) => p.name)
      .filter(Boolean)
      .slice(0, 6);
    const provinceCount = provinces.length;
    const themeName = theme ?? 'classic';
    return [
      `Interactive world map, ${themeName} theme,`,
      `${provinceCount} province${provinceCount === 1 ? '' : 's'} loaded,`,
      playerNames.length
        ? `nations on map: ${playerNames.join(', ')}${playerNames.length < Object.keys(players).length ? '…' : ''}.`
        : 'no nations placed yet.',
      'Click a province to select it; use mouse wheel or pinch to zoom.',
    ].join(' ');
  }, [players, provinces.length, theme]);

  return (
    <>
      <div
        className="absolute inset-0 w-full h-full overflow-hidden"
        role="application"
        aria-roledescription="Interactive world map"
        aria-label={accessibilityLabel}
        aria-busy={!mapReady}
      >
        <MapGL
          ref={mapRef}
          initialViewState={{ longitude: 0, latitude: 20, zoom: 1.5 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={mapStyle}
          interactiveLayerIds={interactiveLayerIds}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onZoomEnd={handleZoomEnd}
          dragRotate={false}
          touchZoomRotate={true}
          pitchWithRotate={false}
          maxPitch={0}
          attributionControl={false}
          renderWorldCopies={false}
          minZoom={1}
          onLoad={handleMapLoad}
          onIdle={() => {
            if (!mapReady) setMapReady(true);
          }}
        >
          {/* Base fill: solid land color under all polygons to hide sub-pixel gaps */}
          <Source id="land-base" type="geojson" data={tier1GeoJSON} buffer={256} tolerance={0.375}>
            <Layer
              id="land-base-fill"
              type="fill"
              paint={{
                'fill-color': th.land,
                'fill-antialias': false,
              }}
            />
          </Source>

          {/* ── Tier 1: Countries (zoom 0 - 3.5) ── */}
          <Source id="countries" type="geojson" data={tier1GeoJSON} buffer={256} tolerance={0.375}>
            <Layer
              id="countries-seam"
              type="line"
              maxzoom={3.5}
              paint={{
                'line-color': ['get', 'fillColor'],
                'line-width': 1,
                'line-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.95, 3, 0.95, 3.5, 0],
              }}
            />
            <Layer
              id="countries-fill"
              type="fill"
              maxzoom={3.5}
              paint={{
                'fill-color': ['get', 'fillColor'],
                'fill-opacity': ['interpolate', ['linear'], ['zoom'], 0, 0.95, 3, 0.95, 3.5, 0],
                'fill-antialias': false,
              }}
            />
            <Layer
              id="countries-border"
              type="line"
              maxzoom={3.5}
              paint={{
                'line-color': th.border,
                'line-width': ['interpolate', ['linear'], ['zoom'], 0, 0.4, 3, 0.8],
                'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.7, 3.5, 0],
              }}
            />
            {/* Player country highlight at low zoom */}
            <Layer
              id="countries-player-border"
              type="line"
              maxzoom={3.5}
              filter={['==', ['get', 'isPlayer'], 1]}
              paint={{
                'line-color': th.playerBorder,
                'line-width': ['interpolate', ['linear'], ['zoom'], 0, 1.5, 3, 2.5],
                'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.8, 3.5, 0],
              }}
            />
          </Source>

          {/* ── Tier 2: Regions (zoom 2.5+) ── */}
          <Source id="regions" type="geojson" data={tier2GeoJSON} buffer={256} tolerance={0.375}>
            <Layer
              id="regions-seam"
              type="line"
              minzoom={2.5}
              paint={{
                'line-color': ['get', 'fillColor'],
                'line-width': 1,
                'line-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  2.5,
                  0,
                  3.5,
                  0.95,
                  ...(tier3Colored ? [6, 0.95, 6.5, 0] : []),
                ],
              }}
            />
            <Layer
              id="regions-fill"
              type="fill"
              minzoom={2.5}
              paint={{
                'fill-color': ['get', 'fillColor'],
                'fill-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  2.5,
                  0,
                  3.5,
                  0.95,
                  ...(tier3Colored ? [6, 0.95, 6.5, 0] : []),
                ],
                'fill-antialias': false,
              }}
            />
            <Layer
              id="regions-border"
              type="line"
              minzoom={2.5}
              paint={{
                'line-color': [
                  'case',
                  ['==', ['get', 'isSubNational'], 1],
                  'rgba(255,255,255,0.15)',
                  th.border,
                ],
                'line-width': ['case', ['==', ['get', 'isSubNational'], 1], 0.4, 0.8],
                'line-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  2.5,
                  0,
                  3.5,
                  0.8,
                  ...(tier3Colored ? [6, 0.8, 6.5, 0] : []),
                ],
              }}
            />
            {/* Player territory border at region zoom */}
            <Layer
              id="regions-player-border"
              type="line"
              minzoom={2.5}
              filter={['==', ['get', 'isPlayer'], 1]}
              paint={{
                'line-color': th.playerBorder,
                'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1.5, 6, 2],
                'line-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  2.5,
                  0,
                  3.5,
                  0.8,
                  ...(tier3Colored ? [6, 0.8, 6.5, 0] : []),
                ],
              }}
            />
          </Source>

          {/* ── Tier 3: States (zoom 6+) ── */}
          {tier3Colored && (
            <Source id="states" type="geojson" data={tier3Colored} buffer={256} tolerance={0.375}>
              <Layer
                id="states-seam"
                type="line"
                minzoom={5.5}
                paint={{
                  'line-color': ['get', 'fillColor'],
                  'line-width': 1,
                  'line-opacity': ['interpolate', ['linear'], ['zoom'], 5.5, 0, 6.5, 0.95],
                }}
              />
              <Layer
                id="states-fill"
                type="fill"
                minzoom={5.5}
                paint={{
                  'fill-color': ['get', 'fillColor'],
                  'fill-opacity': ['interpolate', ['linear'], ['zoom'], 5.5, 0, 6.5, 0.95],
                  'fill-antialias': false,
                }}
              />
              <Layer
                id="states-border"
                type="line"
                minzoom={5.5}
                paint={{
                  'line-color': 'rgba(255,255,255,0.18)',
                  'line-width': 0.5,
                  'line-opacity': ['interpolate', ['linear'], ['zoom'], 5.5, 0, 6.5, 0.7],
                }}
              />
            </Source>
          )}

          {/* ── Player Territory Highlight (all zooms) ── */}
          <Source id="player-territory" type="geojson" data={playerTerritoryGeoJSON}>
            <Layer
              id="player-glow"
              type="line"
              paint={{
                'line-color': th.playerGlow,
                'line-width': ['interpolate', ['linear'], ['zoom'], 1, 4, 6, 6],
                'line-blur': 3,
                'line-opacity': 0.6,
              }}
            />
            <Layer
              id="player-border"
              type="line"
              paint={{
                'line-color': th.playerBorder,
                'line-width': ['interpolate', ['linear'], ['zoom'], 1, 1.2, 6, 2],
                'line-opacity': 0.85,
              }}
            />
          </Source>

          {/* ── Hostile Borders (steady orange) ── */}
          {hostilePairs.size > 0 && (
            <Source id="hostile-borders" type="geojson" data={hostileBorderGeoJSON}>
              <Layer
                id="hostile-border"
                type="line"
                paint={{
                  'line-color': 'rgba(251,146,60,0.7)',
                  'line-width': 2,
                  'line-dasharray': [4, 2],
                  'line-opacity': warOpacity * 0.8,
                }}
              />
            </Source>
          )}

          {/* ── War Borders (pulsing red) ── */}
          {warPairs.size > 0 && (
            <Source id="war-borders" type="geojson" data={warBorderGeoJSON}>
              <Layer
                id="war-glow"
                type="line"
                paint={{
                  'line-color': 'rgba(239,68,68,0.4)',
                  'line-width': 5,
                  'line-blur': 4,
                  'line-opacity': warOpacity,
                }}
              />
              <Layer
                id="war-border"
                type="line"
                paint={{
                  'line-color': 'rgba(255,50,50,1)',
                  'line-width': 2,
                  'line-opacity': warOpacity,
                }}
              />
            </Source>
          )}

          {/* ── Allied Borders (subtle green) ── */}
          {alliedPairs.size > 0 && (
            <Source id="allied-borders" type="geojson" data={alliedBorderGeoJSON}>
              <Layer
                id="allied-border"
                type="line"
                paint={{
                  'line-color': 'rgba(74,222,128,0.35)',
                  'line-width': 1.5,
                }}
              />
            </Source>
          )}

          {/* ── Selected Province Outline ── */}
          <Source id="selected" type="geojson" data={selectedGeoJSON}>
            <Layer
              id="selected-glow"
              type="line"
              paint={{
                'line-color': th.selected,
                'line-width': 6,
                'line-opacity': 0.45,
                'line-blur': 4,
              }}
            />
            <Layer
              id="selected-outline"
              type="line"
              paint={{
                'line-color': th.selected,
                'line-width': 2.5,
                'line-opacity': 1,
              }}
            />
          </Source>

          {/* ── Province Labels ── */}
          <Source id="labels" type="geojson" data={labelsGeoJSON}>
            <Layer
              id="province-labels"
              type="symbol"
              minzoom={2}
              layout={{
                'text-field': ['get', 'name'],
                'text-size': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  2,
                  [
                    'case',
                    ['>=', ['get', 'population'], 100],
                    11,
                    ['>=', ['get', 'population'], 30],
                    9,
                    7,
                  ],
                  6,
                  [
                    'case',
                    ['>=', ['get', 'population'], 100],
                    14,
                    ['>=', ['get', 'population'], 30],
                    12,
                    10,
                  ],
                ],
                'text-font': ['Open Sans Bold'],
                'text-transform': ['case', ['>=', ['get', 'population'], 30], 'uppercase', 'none'],
                'text-allow-overlap': false,
                'text-ignore-placement': false,
                'text-padding': 4,
                'text-max-width': 8,
              }}
              paint={{
                'text-color': ['case', ['==', ['get', 'isPlayer'], 1], '#ffffff', th.text],
                'text-halo-color': 'rgba(0,0,0,0.85)',
                'text-halo-width': 1.5,
                'text-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  2,
                  ['case', ['>=', ['get', 'population'], 100], 1, 0],
                  3,
                  ['case', ['>=', ['get', 'population'], 30], 1, 0],
                  4,
                  ['case', ['>=', ['get', 'population'], 10], 1, 0],
                  5,
                  1,
                ],
              }}
            />
          </Source>

          {/* ── Ocean / Sea Labels ── */}
          <Source id="oceans" type="geojson" data={oceansGeoJSON}>
            <Layer
              id="ocean-labels"
              type="symbol"
              layout={{
                'text-field': ['get', 'name'],
                'text-font': ['Open Sans Bold'],
                'text-size': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  1,
                  ['case', ['==', ['get', 'major'], 1], 11, 9],
                  2,
                  ['case', ['==', ['get', 'major'], 1], 12.6667, 9],
                  4,
                  ['case', ['==', ['get', 'major'], 1], 16, 11],
                  5,
                  ['case', ['==', ['get', 'major'], 1], 16, 12],
                ],
                'text-letter-spacing': ['case', ['==', ['get', 'major'], 1], 0.35, 0.1],
                'text-allow-overlap': false,
                'text-padding': 4,
              }}
              paint={{
                'text-color': 'rgba(148,184,220,0.55)',
                'text-halo-color': 'rgba(0,0,0,0.55)',
                'text-halo-width': 1,
                'text-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  0,
                  ['case', ['==', ['get', 'major'], 1], 0.8, 0],
                  3,
                  ['case', ['==', ['get', 'major'], 1], 0.7, 0.6],
                  6,
                  0.4,
                  7,
                  0,
                ],
              }}
            />
          </Source>

          {/* ── City Labels ── */}
          <Source id="cities" type="geojson" data={citiesGeoJSON}>
            <Layer
              id="city-dots"
              type="circle"
              minzoom={3}
              paint={{
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 1.5, 8, 3],
                'circle-color': '#fbbf24',
                'circle-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  3,
                  ['case', ['==', ['get', 'tier'], 1], 0.8, 0],
                  4,
                  ['case', ['<=', ['get', 'tier'], 2], 0.8, 0],
                  6,
                  ['case', ['<=', ['get', 'tier'], 3], 0.8, 0],
                  8,
                  0.8,
                ],
              }}
            />
            <Layer
              id="city-labels"
              type="symbol"
              minzoom={3}
              layout={{
                'text-field': ['get', 'name'],
                'text-size': ['interpolate', ['linear'], ['zoom'], 3, 9, 8, 12],
                'text-font': ['Open Sans Bold'],
                'text-offset': [0.8, 0],
                'text-anchor': 'left',
                'text-allow-overlap': false,
                'text-padding': 2,
              }}
              paint={{
                'text-color': '#fde68a',
                'text-halo-color': 'rgba(0,0,0,0.85)',
                'text-halo-width': 1.2,
                'text-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  3,
                  ['case', ['==', ['get', 'tier'], 1], 0.9, 0],
                  4,
                  ['case', ['<=', ['get', 'tier'], 2], 0.9, 0],
                  6,
                  ['case', ['<=', ['get', 'tier'], 3], 0.9, 0],
                  8,
                  0.9,
                ],
              }}
            />
          </Source>
        </MapGL>

        {/* ── Vignette Overlay ── */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.35) 100%)',
          }}
        />
      </div>

      {/* ── Tooltip ── */}
      {tooltipData?.province && tooltipScreenPos && (
        <Tooltip
          province={tooltipData.province}
          owner={tooltipData.owner}
          position={tooltipScreenPos}
        />
      )}
    </>
  );
}
