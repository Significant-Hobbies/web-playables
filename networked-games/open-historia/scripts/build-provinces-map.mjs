#!/usr/bin/env node
/**
 * build-provinces-map.mjs
 *
 * Downloads Natural Earth admin-1 data and combines it with country-level data
 * to produce a hybrid TopoJSON with sub-national provinces for large countries
 * and whole-country provinces for everything else.
 *
 * Usage: node scripts/build-provinces-map.mjs
 * Output: public/provinces-combined.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as topojsonServer from 'topojson-server';
import * as topojsonSimplify from 'topojson-simplify';
import * as topojsonClient from 'topojson-client';
import { SUBDIVIDE_COUNTRIES, SUBDIVIDED_ISO_CODES } from './region-config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '.cache');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const ADMIN1_URL =
  'https://raw.githubusercontent.com/mtraynham/natural-earth-topo/master/topojson/ne_10m_admin_1_states_provinces.json';
const ADMIN1_CACHE = path.join(CACHE_DIR, 'ne_10m_admin_1.json');

// ── Helpers ────────────────────────────────────────────────────────────────

async function downloadIfNeeded(url, cachePath) {
  if (fs.existsSync(cachePath)) {
    console.log(`  Using cached: ${path.basename(cachePath)}`);
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  }
  console.log(`  Downloading: ${url}`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  const text = await resp.text();
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, text);
  return JSON.parse(text);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Building combined provinces map ===\n');

  // 1. Load country-level data (world-50m.json)
  console.log('Step 1: Loading country-level data...');
  const worldPath = path.join(PUBLIC_DIR, 'world-50m.json');
  const worldTopo = JSON.parse(fs.readFileSync(worldPath, 'utf8'));
  const worldGeo = topojsonClient.feature(worldTopo, worldTopo.objects.countries);

  // 2. Download admin-1 data
  console.log('Step 2: Loading admin-1 data...');
  const admin1Topo = await downloadIfNeeded(ADMIN1_URL, ADMIN1_CACHE);

  // Find the admin-1 object key
  const admin1Key =
    Object.keys(admin1Topo.objects).find((k) => k.includes('admin_1')) ||
    Object.keys(admin1Topo.objects)[0];
  if (!admin1Key) throw new Error('No admin-1 object found in topology');
  console.log(`  Admin-1 object key: ${admin1Key}`);

  const admin1Geo = topojsonClient.feature(admin1Topo, admin1Topo.objects[admin1Key]);
  console.log(`  Admin-1 features: ${admin1Geo.features.length}`);

  // 3. Build sub-national provinces for large countries
  console.log('\nStep 3: Building sub-national provinces...');
  const allFeatures = [];
  let subProvinceCount = 0;

  for (const [adm0Code, config] of Object.entries(SUBDIVIDE_COUNTRIES)) {
    // Find all admin-1 features for this country
    const countryAdmin1 = admin1Geo.features.filter((f) => {
      const a3 = (
        f.properties.adm0_a3 ||
        f.properties.gu_a3 ||
        f.properties.sov_a3 ||
        ''
      ).toUpperCase();
      return a3 === adm0Code;
    });

    if (countryAdmin1.length === 0) {
      console.log(`  WARNING: No admin-1 features found for ${adm0Code} (${config.parentName})`);
      // Fall back to using country-level geometry
      const countryFeature = worldGeo.features.find((f) => {
        const id = String(f.id).padStart(3, '0');
        return id === config.isoNumeric;
      });
      if (countryFeature) {
        allFeatures.push({
          type: 'Feature',
          geometry: countryFeature.geometry,
          properties: {
            provinceId: config.isoNumeric,
            displayName: config.parentName,
            parentCountryId: config.isoNumeric,
            parentCountryName: config.parentName,
            isSubNational: false,
            color: config.color,
            population: config.totalPop,
            defense: config.totalDef,
            economy: config.totalEco,
            technology: config.totalTech,
          },
        });
      }
      continue;
    }

    console.log(`  ${config.parentName}: ${countryAdmin1.length} admin-1 features`);

    // Assign each admin-1 feature to a region
    const regionFeatures = {};
    for (const region of config.regions) {
      regionFeatures[region.slug] = [];
    }

    for (const feature of countryAdmin1) {
      let assigned = false;
      for (const region of config.regions) {
        if (region.slug === '_rest') continue; // Skip fallback for now
        if (region.match(feature.properties)) {
          regionFeatures[region.slug].push(feature);
          assigned = true;
          break;
        }
      }
      if (!assigned) {
        // Assign to _rest fallback
        const restRegion = config.regions.find((r) => r.slug === '_rest');
        if (restRegion) {
          regionFeatures['_rest'].push(feature);
        } else {
          // Assign to last defined region
          const lastRegion = config.regions[config.regions.length - 1];
          regionFeatures[lastRegion.slug].push(feature);
        }
      }
    }

    // Build merged features per region
    for (const region of config.regions) {
      const features = regionFeatures[region.slug];
      if (!features || features.length === 0) {
        if (region.slug !== '_rest') {
          console.log(`    WARNING: No features for region "${region.name}" - skipping`);
        }
        continue;
      }

      // Merge all geometries for this region into one
      const mergedCoords = [];
      for (const f of features) {
        const geom = f.geometry;
        if (geom.type === 'Polygon') {
          mergedCoords.push(geom.coordinates);
        } else if (geom.type === 'MultiPolygon') {
          mergedCoords.push(...geom.coordinates);
        }
      }

      if (mergedCoords.length === 0) continue;

      const mergedGeometry =
        mergedCoords.length === 1
          ? { type: 'Polygon', coordinates: mergedCoords[0] }
          : { type: 'MultiPolygon', coordinates: mergedCoords };

      const provinceId = `${adm0Code}_${region.slug}`;
      const displayName = `${region.name} (${config.parentName})`;

      // Calculate resources
      const pop = Math.round(config.totalPop * (region.weight.pop || 0));
      const eco = Math.round(config.totalEco * (region.weight.eco || 0));

      allFeatures.push({
        type: 'Feature',
        geometry: mergedGeometry,
        properties: {
          provinceId,
          displayName,
          parentCountryId: config.isoNumeric,
          parentCountryName: config.parentName,
          isSubNational: true,
          color: config.color,
          population: Math.max(1, pop),
          defense: config.totalDef,
          economy: Math.max(1, eco),
          technology: config.totalTech,
        },
      });
      subProvinceCount++;
    }
  }

  console.log(`  Total sub-national provinces: ${subProvinceCount}`);

  // 4. Add non-subdivided countries
  console.log('\nStep 4: Adding non-subdivided countries...');

  // Import country data from world-loader (inline the essentials)
  const COUNTRY_NAMES = await loadCountryNames();
  const COUNTRY_DATA = await loadCountryData();
  const NATION_COLORS = await loadNationColors();

  let countryCount = 0;
  const seenIds = new Set();

  for (const feature of worldGeo.features) {
    const rawId = feature.id != null ? String(feature.id).padStart(3, '0') : '';
    if (!rawId || rawId === '010') continue; // Skip Antarctica
    if (SUBDIVIDED_ISO_CODES.has(rawId)) continue; // Skip subdivided countries
    if (seenIds.has(rawId)) continue; // Skip duplicates
    seenIds.add(rawId);

    const name = COUNTRY_NAMES[rawId] || `Region ${rawId}`;
    const stats = COUNTRY_DATA[rawId] || { population: 2, defense: 2, economy: 10, technology: 3 };
    const color = NATION_COLORS[rawId] || '#4a5568';

    allFeatures.push({
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        provinceId: rawId,
        displayName: name,
        parentCountryId: rawId,
        parentCountryName: name,
        isSubNational: false,
        color,
        population: stats.population,
        defense: stats.defense,
        economy: stats.economy,
        technology: stats.technology,
      },
    });
    countryCount++;
  }

  console.log(`  Non-subdivided countries: ${countryCount}`);
  console.log(`  Total features: ${allFeatures.length}`);

  // 5. Build combined GeoJSON
  console.log('\nStep 5: Building combined topology...');
  const combinedGeoJSON = {
    type: 'FeatureCollection',
    features: allFeatures,
  };

  // 6. Convert to TopoJSON
  const topology = topojsonServer.topology({ provinces: combinedGeoJSON }, 1e5);
  console.log(`  Topology arcs: ${topology.arcs.length}`);

  // 7. Simplify
  console.log('Step 6: Simplifying...');
  const presimplified = topojsonSimplify.presimplify(topology);
  // Target: keep enough detail for a good-looking map
  const minWeight = topojsonSimplify.quantile(presimplified, 0.02);
  const simplified = topojsonSimplify.simplify(presimplified, minWeight);

  // 8. Write output
  const outputPath = path.join(PUBLIC_DIR, 'provinces-combined.json');
  const output = JSON.stringify(simplified);
  fs.writeFileSync(outputPath, output);

  const sizeMB = (output.length / 1024 / 1024).toFixed(2);
  console.log(`\nDone! Output: ${outputPath} (${sizeMB} MB)`);
  console.log(
    `Total provinces: ${allFeatures.length} (${subProvinceCount} sub-national + ${countryCount} countries)`
  );

  // 9. Build tier 3 detail data (individual admin-1 states for subdivided countries)
  console.log('\nStep 7: Building admin1-detail.json (tier 3)...');
  const detailFeatures = [];

  // For each subdivided country, emit individual admin-1 features
  for (const [adm0Code, config] of Object.entries(SUBDIVIDE_COUNTRIES)) {
    const countryAdmin1 = admin1Geo.features.filter((f) => {
      const a3 = (
        f.properties.adm0_a3 ||
        f.properties.gu_a3 ||
        f.properties.sov_a3 ||
        ''
      ).toUpperCase();
      return a3 === adm0Code;
    });

    if (countryAdmin1.length === 0) continue;

    for (const feature of countryAdmin1) {
      // Determine which region this state belongs to
      let regionId = `${adm0Code}__rest`;
      for (const region of config.regions) {
        if (region.slug === '_rest') continue;
        if (region.match(feature.properties)) {
          regionId = `${adm0Code}_${region.slug}`;
          break;
        }
      }
      // If not matched by named regions, assign to _rest
      if (regionId === `${adm0Code}__rest`) {
        const restRegion = config.regions.find((r) => r.slug === '_rest');
        if (restRegion) {
          regionId = `${adm0Code}__rest`;
        } else {
          regionId = `${adm0Code}_${config.regions[config.regions.length - 1].slug}`;
        }
      }

      const stateName = feature.properties.name || feature.properties.name_en || 'Unknown';
      const stateId = `${adm0Code}_state_${(feature.properties.iso_3166_2 || stateName).replace(/[^a-zA-Z0-9]/g, '_')}`;

      detailFeatures.push({
        type: 'Feature',
        geometry: feature.geometry,
        properties: {
          stateId,
          displayName: stateName,
          regionId,
          parentCountryId: config.isoNumeric,
          parentCountryName: config.parentName,
          color: config.color,
        },
      });
    }
  }

  // Non-subdivided countries: include as-is (same geometry as tier 2)
  for (const feature of worldGeo.features) {
    const rawId = feature.id != null ? String(feature.id).padStart(3, '0') : '';
    if (!rawId || rawId === '010') continue;
    if (SUBDIVIDED_ISO_CODES.has(rawId)) continue;

    const name = COUNTRY_NAMES[rawId] || `Region ${rawId}`;
    const color = NATION_COLORS[rawId] || '#4a5568';

    detailFeatures.push({
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        stateId: rawId,
        displayName: name,
        regionId: rawId,
        parentCountryId: rawId,
        parentCountryName: name,
        color,
      },
    });
  }

  console.log(`  Tier 3 features: ${detailFeatures.length}`);

  // Convert to TopoJSON and simplify
  const detailGeoJSON = { type: 'FeatureCollection', features: detailFeatures };
  const detailTopo = topojsonServer.topology({ states: detailGeoJSON }, 1e5);
  const detailPresimplified = topojsonSimplify.presimplify(detailTopo);
  const detailMinWeight = topojsonSimplify.quantile(detailPresimplified, 0.01);
  const detailSimplified = topojsonSimplify.simplify(detailPresimplified, detailMinWeight);

  const detailOutputPath = path.join(PUBLIC_DIR, 'admin1-detail.json');
  const detailOutput = JSON.stringify(detailSimplified);
  fs.writeFileSync(detailOutputPath, detailOutput);

  const detailSizeMB = (detailOutput.length / 1024 / 1024).toFixed(2);
  console.log(`  Output: ${detailOutputPath} (${detailSizeMB} MB)`);
  console.log(`  Total tier 3 features: ${detailFeatures.length}`);
}

// ── Inline data loaders (extracted from world-loader.ts) ──────────────────

async function loadCountryNames() {
  // Read directly from world-loader.ts source
  const loaderPath = path.join(__dirname, '..', 'lib', 'world-loader.ts');
  const src = fs.readFileSync(loaderPath, 'utf8');
  const match = src.match(/const COUNTRY_NAMES[^=]*=\s*\{([^}]+)\}/s);
  if (!match) throw new Error('Could not parse COUNTRY_NAMES from world-loader.ts');
  // Parse the object manually
  const entries = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const m = line.match(/"(\d+)":\s*"([^"]+)"/);
    if (m) entries[m[1]] = m[2];
  }
  return entries;
}

async function loadCountryData() {
  const loaderPath = path.join(__dirname, '..', 'lib', 'world-loader.ts');
  const src = fs.readFileSync(loaderPath, 'utf8');
  const match = src.match(/const COUNTRY_DATA[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!match) throw new Error('Could not parse COUNTRY_DATA from world-loader.ts');
  const entries = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const m = line.match(
      /"(\d+)":\s*\{\s*population:\s*([\d.]+)\s*,\s*defense:\s*(\d+)\s*,\s*economy:\s*([\d.]+)\s*,\s*technology:\s*(\d+)\s*\}/
    );
    if (m) {
      entries[m[1]] = {
        population: parseFloat(m[2]),
        defense: parseInt(m[3]),
        economy: parseFloat(m[4]),
        technology: parseInt(m[5]),
      };
    }
  }
  return entries;
}

async function loadNationColors() {
  const loaderPath = path.join(__dirname, '..', 'lib', 'world-loader.ts');
  const src = fs.readFileSync(loaderPath, 'utf8');
  const match = src.match(/const NATION_COLORS[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!match) throw new Error('Could not parse NATION_COLORS from world-loader.ts');
  const entries = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const m = line.match(/"(\d+)":\s*"([^"]+)"/);
    if (m) entries[m[1]] = m[2];
  }
  return entries;
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
