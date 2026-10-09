import { geoCentroid } from 'd3-geo';
import * as topojson from 'topojson-client';

import type { Province } from './types';

/**
 * Grand-strategy-style nation colors (inspired by EU4/HOI4/Victoria).
 * Keyed by ISO 3166-1 numeric code.
 */
const NATION_COLORS: Record<string, string> = {
  // ── Major Powers (very distinctive, EU4-style) ──
  '840': '#36619e', // USA – navy blue
  '826': '#b83230', // UK – imperial red
  '250': '#2a7fbf', // France – royal blue
  '276': '#6b6d6e', // Germany – iron gray
  '643': '#208b3a', // Russia – deep green
  '156': '#c6a834', // China – Ming gold
  '392': '#7b3f9e', // Japan – imperial purple
  '356': '#d48425', // India – saffron
  '076': '#1c7a3b', // Brazil – verde
  '380': '#3da577', // Italy – jade green
  // ── Europe ──
  '724': '#d4a017', // Spain – Castile gold
  '620': '#2d6a4f', // Portugal – maritime green
  '528': '#d97706', // Netherlands – House of Orange
  '056': '#6d5c4f', // Belgium – dark taupe
  '756': '#d63031', // Switzerland – red cross
  '040': '#d5d5d5', // Austria – Habsburg white
  '616': '#c92a2a', // Poland – crimson
  '804': '#3b82c4', // Ukraine – cerulean
  '752': '#3c7bb3', // Sweden – Swedish blue
  '578': '#1e4b7a', // Norway – fjord blue
  '208': '#b83230', // Denmark – Scandinavian red
  '246': '#c8cfd6', // Finland – snow white
  '300': '#408abf', // Greece – Hellenic blue
  '642': '#d4a017', // Romania – gold
  '348': '#4c9e2d', // Hungary – lime green
  '203': '#4682b4', // Czechia – steel blue
  '705': '#5ba3c9', // Slovenia – alpine blue
  '191': '#cf3535', // Croatia – checkerboard red
  '688': '#8b5e3c', // Serbia – umber brown
  '100': '#5aad4b', // Bulgaria – forest green
  '008': '#b22222', // Albania – blood red
  '233': '#60a5c8', // Estonia – Baltic blue
  '428': '#7a2e2e', // Latvia – dark maroon
  '440': '#c8a62c', // Lithuania – amber gold
  '372': '#2ea04e', // Ireland – emerald
  '352': '#5b8db8', // Iceland – glacier blue
  '807': '#a83232', // N. Macedonia – red
  '499': '#5c6870', // Montenegro – slate
  '070': '#3f7fba', // Bosnia – blue
  '703': '#5074a0', // Slovakia – blue
  '112': '#a03030', // Belarus – red
  '498': '#507090', // Moldova – dusty blue
  // ── Middle East ──
  '792': '#5b8c5a', // Turkey – Ottoman olive
  '682': '#2d8a4e', // Saudi Arabia – green
  '364': '#4d7a9e', // Iran – Persian blue
  '368': '#8a5e3c', // Iraq – Mesopotamian brown
  '376': '#3a73ba', // Israel – blue
  '818': '#c8a82c', // Egypt – pharaoh gold
  '760': '#7a3e3e', // Syria – dark red
  '400': '#a85e32', // Jordan – Hashemite orange
  '422': '#b84040', // Lebanon – cedar red
  '784': '#3c4a5c', // UAE – dark teal
  '634': '#6a2e4a', // Qatar – tyrian purple
  '414': '#3e8a5a', // Kuwait – green
  '512': '#a84040', // Oman – red
  '887': '#8a5050', // Yemen – earthy red
  // ── East & SE Asia ──
  '410': '#4a8cc0', // South Korea – blue
  '408': '#c03030', // North Korea – red
  '158': '#3aa06a', // Taiwan – jade green
  '764': '#c04050', // Thailand – Siamese red
  '704': '#b03030', // Vietnam – red
  '360': '#a83030', // Indonesia – red
  '608': '#4878b0', // Philippines – blue
  '458': '#c49a20', // Malaysia – gold
  '702': '#c04040', // Singapore – red
  '104': '#c08820', // Myanmar – golden
  '116': '#5070a0', // Cambodia – blue
  '496': '#5890c0', // Mongolia – eternal blue sky
  '418': '#b04040', // Laos – red
  // ── Central & South Asia ──
  '586': '#2d7a4a', // Pakistan – green
  '050': '#2a6a3a', // Bangladesh – deep green
  '144': '#7a3838', // Sri Lanka – lion maroon
  '524': '#b83838', // Nepal – crimson
  '398': '#4a90c8', // Kazakhstan – blue
  '860': '#488ab0', // Uzbekistan – blue
  '762': '#a05050', // Tajikistan – red
  '795': '#3a7a58', // Turkmenistan – green
  '417': '#c04848', // Kyrgyzstan – red
  '004': '#5a7844', // Afghanistan – mujahedeen green
  // ── Africa ──
  '566': '#2a7a3e', // Nigeria – green
  '710': '#c88030', // South Africa – Springbok gold
  '404': '#5a3828', // Kenya – earth brown
  '231': '#2a8a40', // Ethiopia – green
  '012': '#2a7a40', // Algeria – green
  '504': '#b04040', // Morocco – red
  '834': '#4888b0', // Tanzania – blue
  '180': '#4878a0', // DR Congo – blue
  '800': '#c8a020', // Uganda – gold
  '288': '#c89820', // Ghana – gold
  '120': '#2a7a3a', // Cameroon – green
  '384': '#d08020', // Côte d'Ivoire – orange
  '686': '#308040', // Senegal – green
  '434': '#4a5a6a', // Libya – dark slate
  '729': '#a04040', // Sudan – red
  '728': '#607848', // South Sudan – olive
  '024': '#a03838', // Angola – red
  '508': '#c89830', // Mozambique – gold
  '450': '#8a6840', // Madagascar – sienna
  '466': '#c09030', // Mali – savanna gold
  '562': '#c0a040', // Niger – saharan gold
  '148': '#a88840', // Chad – desert gold
  '854': '#508848', // Burkina Faso – green
  '894': '#48784a', // Zambia – green
  '716': '#4a7840', // Zimbabwe – green
  '454': '#c04848', // Malawi – red
  '072': '#4890b0', // Botswana – blue
  // ── Americas ──
  '124': '#c03838', // Canada – maple red
  '484': '#3a7a48', // Mexico – green
  '032': '#6aaed6', // Argentina – sky blue
  '152': '#b04040', // Chile – red
  '170': '#c8a020', // Colombia – gold
  '604': '#b04040', // Peru – red
  '862': '#c8a828', // Venezuela – gold
  '192': '#a03838', // Cuba – red
  '218': '#c8a830', // Ecuador – gold
  '068': '#c88848', // Bolivia – earthy gold
  '600': '#b04848', // Paraguay – red
  '858': '#4a80b8', // Uruguay – blue
  '328': '#389048', // Guyana – green
  '214': '#4a68a8', // Dominican Rep. – blue
  '332': '#4a5890', // Haiti – blue
  '591': '#4880a0', // Panama – blue
  // ── Oceania ──
  '036': '#c89030', // Australia – ochre gold
  '554': '#3a5060', // New Zealand – dark teal
  '598': '#6a4030', // Papua New Guinea – earth brown
};

function countryColor(isoCode: string): string {
  if (NATION_COLORS[isoCode]) return NATION_COLORS[isoCode];
  // Fallback: golden angle for unlisted countries
  const num = parseInt(isoCode, 10) || 0;
  const hue = (num * 137.508) % 360;
  return `hsl(${Math.round(hue)}, 35%, 28%)`;
}

export type WorldLoadResult = {
  provinces: Province[];
  error: string | null;
};

export async function loadWorldData(): Promise<Province[]> {
  const { provinces } = await loadWorldDataDetailed();
  return provinces;
}

export async function loadWorldDataDetailed(): Promise<WorldLoadResult> {
  try {
    const response = await fetch('/provinces-combined.json');
    if (!response.ok) {
      return {
        provinces: [],
        error: `Map data could not be loaded (HTTP ${response.status}). The /provinces-combined.json asset may be missing from this deployment.`,
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topology: any = await response.json();

    const provincesObject = topology.objects.provinces;

    // Compute neighbor adjacency from the combined topology
    const neighborIndices = topojson.neighbors(provincesObject.geometries);

    // Convert topology to GeoJSON FeatureCollection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geojson = topojson.feature(topology, provincesObject) as any;

    // Build mapping from geometry index to province id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idByIndex: string[] = provincesObject.geometries.map((g: any) => {
      return g.properties?.provinceId || '';
    });

    const allIds = new Set(idByIndex.filter(Boolean));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provinces: Province[] = geojson.features.map((feature: any, index: number) => {
      const props = feature.properties || {};
      const id = props.provinceId || String(index);
      const name = props.displayName || `Region ${id}`;
      const color = props.color || countryColor(props.parentCountryId || id);

      // Compute centroid using d3-geo
      let center: [number, number] = [0, 0];
      try {
        const centroid = geoCentroid(feature);
        if (centroid && isFinite(centroid[0]) && isFinite(centroid[1])) {
          center = centroid as [number, number];
        }
      } catch {
        // Some degenerate geometries may fail; keep [0,0]
      }

      // Resolve neighbor ids from precomputed topology
      const neighborIds: string[] = [];
      const rawNeighborIndices = neighborIndices[index] || [];
      for (const ni of rawNeighborIndices) {
        const nId = idByIndex[ni];
        if (nId && allIds.has(nId)) {
          neighborIds.push(nId);
        }
      }
      const uniqueNeighborIds = [...new Set(neighborIds)];

      return {
        id,
        name,
        ownerId: null,
        color,
        feature,
        center,
        neighbors: uniqueNeighborIds,
        resources: {
          population: props.population ?? 2,
          defense: props.defense ?? 2,
          economy: props.economy ?? 10,
          technology: props.technology ?? 3,
        },
        parentCountryId: props.parentCountryId,
        parentCountryName: props.parentCountryName,
        isSubNational: props.isSubNational ?? false,
      };
    });

    return { provinces, error: null };
  } catch (error) {
    console.error('Map loading error:', error);
    const message =
      error instanceof Error ? error.message : 'Unknown error while loading the world map.';
    return { provinces: [], error: message };
  }
}
