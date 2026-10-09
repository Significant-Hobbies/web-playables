/**
 * Region configuration for subdividing large countries.
 *
 * Each entry maps a Natural Earth ADM0_A3 country code to an object:
 *   isoNumeric  -- the ISO 3166-1 numeric code used in world-50m.json
 *   parentName  -- short display name for the parent country
 *   color       -- base hex color for the parent (from NATION_COLORS)
 *   regions     -- array of { slug, name, match, weight }
 *       slug   : unique suffix for the province id (e.g. "west_coast")
 *       name   : human-readable region name (shown in game)
 *       match  : function(props) => boolean -- returns true if an admin-1
 *                geometry belongs to this region. `props` has: name, iso_3166_2,
 *                adm0_a3, type_en, region, etc.
 *       weight : { pop, eco } -- fraction of the parent country's stats
 */

// Helper: match by ISO 3166-2 prefix list
const byIso = (codes) => (p) => {
  const iso = (p.iso_3166_2 || '').toUpperCase();
  return codes.some((c) => iso === c.toUpperCase() || iso.startsWith(c.toUpperCase() + '-'));
};

// Helper: match by admin-1 name substring (case-insensitive)
const byName = (names) => (p) => {
  const n = (p.name || p.name_en || '').toLowerCase();
  return names.some((s) => n.includes(s.toLowerCase()));
};

// Catch-all for anything not matched by prior regions
const fallback = () => () => true;

export const SUBDIVIDE_COUNTRIES = {
  // ── USA ──────────────────────────────────────────────────────────────────
  USA: {
    isoNumeric: '840',
    parentName: 'USA',
    color: '#36619e',
    totalPop: 330,
    totalDef: 10,
    totalEco: 25000,
    totalTech: 10,
    regions: [
      {
        slug: 'northeast',
        name: 'Northeast',
        match: byIso([
          'US-NY',
          'US-NJ',
          'US-CT',
          'US-MA',
          'US-RI',
          'US-VT',
          'US-NH',
          'US-ME',
          'US-PA',
          'US-DE',
          'US-MD',
          'US-DC',
        ]),
        weight: { pop: 0.18, eco: 0.22 },
      },
      {
        slug: 'southeast',
        name: 'Southeast',
        match: byIso([
          'US-VA',
          'US-WV',
          'US-NC',
          'US-SC',
          'US-GA',
          'US-FL',
          'US-AL',
          'US-MS',
          'US-TN',
          'US-KY',
          'US-LA',
          'US-AR',
        ]),
        weight: { pop: 0.24, eco: 0.18 },
      },
      {
        slug: 'midwest',
        name: 'Midwest',
        match: byIso([
          'US-OH',
          'US-MI',
          'US-IN',
          'US-IL',
          'US-WI',
          'US-MN',
          'US-IA',
          'US-MO',
          'US-ND',
          'US-SD',
          'US-NE',
          'US-KS',
        ]),
        weight: { pop: 0.15, eco: 0.14 },
      },
      {
        slug: 'southwest',
        name: 'Southwest',
        match: byIso(['US-AZ', 'US-NM', 'US-OK']),
        weight: { pop: 0.05, eco: 0.04 },
      },
      {
        slug: 'west_coast',
        name: 'West Coast',
        match: byIso(['US-CA', 'US-OR', 'US-WA', 'US-HI']),
        weight: { pop: 0.17, eco: 0.22 },
      },
      {
        slug: 'mountain',
        name: 'Mountain',
        match: byIso(['US-CO', 'US-UT', 'US-NV', 'US-MT', 'US-ID', 'US-WY']),
        weight: { pop: 0.04, eco: 0.04 },
      },
      { slug: 'texas', name: 'Texas', match: byIso(['US-TX']), weight: { pop: 0.09, eco: 0.09 } },
      {
        slug: 'alaska',
        name: 'Alaska & Pacific',
        match: byIso(['US-AK']),
        weight: { pop: 0.003, eco: 0.01 },
      },
      { slug: '_rest', name: 'Central USA', match: fallback(), weight: { pop: 0.077, eco: 0.06 } },
    ],
  },

  // ── Russia ───────────────────────────────────────────────────────────────
  RUS: {
    isoNumeric: '643',
    parentName: 'Russia',
    color: '#208b3a',
    totalPop: 144,
    totalDef: 9,
    totalEco: 2000,
    totalTech: 8,
    regions: [
      {
        slug: 'northwest',
        name: 'Northwest Russia',
        match: byName([
          'leningrad',
          'st. peters',
          'novgorod',
          'pskov',
          'kaliningrad',
          'murmansk',
          'karelia',
          'arkhangel',
          'komi',
          'vologda',
          'nenets',
        ]),
        weight: { pop: 0.1, eco: 0.12 },
      },
      {
        slug: 'central',
        name: 'Central Russia',
        match: byName([
          'moscow',
          'moskva',
          'tver',
          'tula',
          'ryazan',
          'vladimir',
          'ivanovo',
          'kostroma',
          'yaroslavl',
          'smolensk',
          'kaluga',
          'bryansk',
          'orel',
          'kursk',
          'belgorod',
          'voronezh',
          'lipetsk',
          'tambov',
        ]),
        weight: { pop: 0.28, eco: 0.35 },
      },
      {
        slug: 'south',
        name: 'Southern Russia',
        match: byName([
          'krasnodar',
          'rostov',
          'volgograd',
          'astrakhan',
          'adygea',
          'crimea',
          'sevastopol',
        ]),
        weight: { pop: 0.12, eco: 0.1 },
      },
      {
        slug: 'caucasus',
        name: 'Caucasus',
        match: byName([
          'dagestan',
          'chechnya',
          'chechen',
          'ingush',
          'ossetia',
          'kabardino',
          'karachay',
          'stavropol',
        ]),
        weight: { pop: 0.07, eco: 0.03 },
      },
      {
        slug: 'volga',
        name: 'Volga Region',
        match: byName([
          'tatarstan',
          'bashkortostan',
          'samara',
          'saratov',
          'nizhny',
          'orenburg',
          'penza',
          'ulyanovsk',
          'chuvash',
          'mari',
          'mordovia',
          'udmurt',
          'perm',
          'kirov',
        ]),
        weight: { pop: 0.15, eco: 0.15 },
      },
      {
        slug: 'urals',
        name: 'Urals',
        match: byName(['sverdlovsk', 'chelyabinsk', 'tyumen', 'khanty', 'yamalo', 'kurgan']),
        weight: { pop: 0.09, eco: 0.1 },
      },
      {
        slug: 'siberia',
        name: 'Siberia',
        match: byName([
          'novosibir',
          'omsk',
          'tomsk',
          'kemerovo',
          'altai',
          'krasnoyarsk',
          'khakass',
          'tuva',
          'irkutsk',
          'buryat',
          'transbaikal',
          'zabaikalsk',
        ]),
        weight: { pop: 0.12, eco: 0.1 },
      },
      {
        slug: 'far_east',
        name: 'Far East Russia',
        match: byName([
          'amur',
          'khabarovsk',
          'primorsk',
          'yakut',
          'sakha',
          'sakhalin',
          'magadan',
          'kamchatka',
          'chukot',
          'jewish',
        ]),
        weight: { pop: 0.05, eco: 0.04 },
      },
      { slug: '_rest', name: 'Inner Russia', match: fallback(), weight: { pop: 0.02, eco: 0.01 } },
    ],
  },

  // ── China ────────────────────────────────────────────────────────────────
  CHN: {
    isoNumeric: '156',
    parentName: 'China',
    color: '#c6a834',
    totalPop: 1400,
    totalDef: 9,
    totalEco: 18000,
    totalTech: 9,
    regions: [
      {
        slug: 'north',
        name: 'North China',
        match: byName(['beijing', 'tianjin', 'hebei', 'shanxi', 'inner mongol', 'nei mongol']),
        weight: { pop: 0.12, eco: 0.14 },
      },
      {
        slug: 'northeast',
        name: 'Northeast China',
        match: byName(['liaoning', 'jilin', 'heilongjiang']),
        weight: { pop: 0.08, eco: 0.06 },
      },
      {
        slug: 'east',
        name: 'East China',
        match: byName([
          'shanghai',
          'jiangsu',
          'zhejiang',
          'anhui',
          'fujian',
          'jiangxi',
          'shandong',
        ]),
        weight: { pop: 0.3, eco: 0.38 },
      },
      {
        slug: 'central',
        name: 'Central China',
        match: byName(['henan', 'hubei', 'hunan']),
        weight: { pop: 0.14, eco: 0.1 },
      },
      {
        slug: 'south',
        name: 'South China',
        match: byName(['guangdong', 'guangxi', 'hainan', 'hong kong', 'macau', 'macao']),
        weight: { pop: 0.12, eco: 0.16 },
      },
      {
        slug: 'southwest',
        name: 'Southwest China',
        match: byName(['chongqing', 'sichuan', 'guizhou', 'yunnan']),
        weight: { pop: 0.14, eco: 0.08 },
      },
      {
        slug: 'northwest',
        name: 'Northwest China',
        match: byName(['shaanxi', 'gansu', 'qinghai', 'ningxia', 'xinjiang']),
        weight: { pop: 0.06, eco: 0.04 },
      },
      {
        slug: 'tibet',
        name: 'Tibet',
        match: byName(['xizang', 'tibet']),
        weight: { pop: 0.003, eco: 0.002 },
      },
      {
        slug: '_rest',
        name: 'Central Provinces (China)',
        match: fallback(),
        weight: { pop: 0.037, eco: 0.038 },
      },
    ],
  },

  // ── Canada ───────────────────────────────────────────────────────────────
  CAN: {
    isoNumeric: '124',
    parentName: 'Canada',
    color: '#c03838',
    totalPop: 39,
    totalDef: 6,
    totalEco: 2100,
    totalTech: 9,
    regions: [
      {
        slug: 'bc',
        name: 'British Columbia',
        match: byName(['british columbia']),
        weight: { pop: 0.14, eco: 0.13 },
      },
      {
        slug: 'prairies',
        name: 'Prairies',
        match: byName(['alberta', 'saskatchewan', 'manitoba']),
        weight: { pop: 0.18, eco: 0.22 },
      },
      {
        slug: 'ontario',
        name: 'Ontario',
        match: byName(['ontario']),
        weight: { pop: 0.39, eco: 0.38 },
      },
      {
        slug: 'quebec',
        name: 'Quebec',
        match: byName(['qu\u00e9bec', 'quebec']),
        weight: { pop: 0.22, eco: 0.2 },
      },
      {
        slug: 'atlantic',
        name: 'Atlantic Canada',
        match: byName([
          'new brunswick',
          'nova scotia',
          'prince edward',
          'newfoundland',
          'labrador',
        ]),
        weight: { pop: 0.06, eco: 0.05 },
      },
      {
        slug: 'north',
        name: 'Northern Canada',
        match: byName(['yukon', 'northwest terr', 'nunavut']),
        weight: { pop: 0.01, eco: 0.02 },
      },
    ],
  },

  // ── Brazil ───────────────────────────────────────────────────────────────
  BRA: {
    isoNumeric: '076',
    parentName: 'Brazil',
    color: '#1c7a3b',
    totalPop: 215,
    totalDef: 5,
    totalEco: 1900,
    totalTech: 6,
    regions: [
      {
        slug: 'southeast',
        name: 'Southeast Brazil',
        match: byName([
          's\u00e3o paulo',
          'sao paulo',
          'rio de janeiro',
          'minas gerais',
          'esp\u00edrito santo',
          'espirito santo',
        ]),
        weight: { pop: 0.42, eco: 0.55 },
      },
      {
        slug: 'south',
        name: 'Southern Brazil',
        match: byName(['paran\u00e1', 'parana', 'santa catarina', 'rio grande do sul']),
        weight: { pop: 0.15, eco: 0.17 },
      },
      {
        slug: 'northeast',
        name: 'Northeast Brazil',
        match: byName([
          'bahia',
          'pernambuco',
          'cear\u00e1',
          'ceara',
          'maranh\u00e3o',
          'maranhao',
          'para\u00edba',
          'paraiba',
          'rio grande do norte',
          'alagoas',
          'piau\u00ed',
          'piaui',
          'sergipe',
        ]),
        weight: { pop: 0.27, eco: 0.14 },
      },
      {
        slug: 'north',
        name: 'Northern Brazil',
        match: byName([
          'amazonas',
          'par\u00e1',
          'para',
          'acre',
          'rond\u00f4nia',
          'rondonia',
          'roraima',
          'amap\u00e1',
          'amapa',
          'tocantins',
        ]),
        weight: { pop: 0.09, eco: 0.06 },
      },
      {
        slug: 'central_west',
        name: 'Central-West Brazil',
        match: byName([
          'goi\u00e1s',
          'goias',
          'mato grosso',
          'distrito federal',
          'bras\u00edlia',
          'brasilia',
        ]),
        weight: { pop: 0.07, eco: 0.08 },
      },
    ],
  },

  // ── Australia ─────────────────────────────────────────────────────────────
  AUS: {
    isoNumeric: '036',
    parentName: 'Australia',
    color: '#c89030',
    totalPop: 26,
    totalDef: 6,
    totalEco: 1700,
    totalTech: 9,
    regions: [
      {
        slug: 'nsw',
        name: 'New South Wales',
        match: byName(['new south wales']),
        weight: { pop: 0.32, eco: 0.33 },
      },
      {
        slug: 'vic',
        name: 'Victoria',
        match: byName(['victoria']),
        weight: { pop: 0.26, eco: 0.25 },
      },
      {
        slug: 'qld',
        name: 'Queensland',
        match: byName(['queensland']),
        weight: { pop: 0.2, eco: 0.2 },
      },
      {
        slug: 'wa',
        name: 'Western Australia',
        match: byName(['western australia']),
        weight: { pop: 0.1, eco: 0.12 },
      },
      {
        slug: 'sa',
        name: 'South Australia',
        match: byName(['south australia']),
        weight: { pop: 0.07, eco: 0.06 },
      },
      {
        slug: 'tas',
        name: 'Tasmania & Territories',
        match: fallback(),
        weight: { pop: 0.05, eco: 0.04 },
      },
    ],
  },

  // ── India ────────────────────────────────────────────────────────────────
  IND: {
    isoNumeric: '356',
    parentName: 'India',
    color: '#d48425',
    totalPop: 1400,
    totalDef: 7,
    totalEco: 3500,
    totalTech: 7,
    regions: [
      {
        slug: 'north',
        name: 'Northern India',
        match: byName([
          'uttar pradesh',
          'delhi',
          'haryana',
          'punjab',
          'himachal',
          'uttarakhand',
          'jammu',
          'kashmir',
          'ladakh',
          'chandigarh',
        ]),
        weight: { pop: 0.25, eco: 0.18 },
      },
      {
        slug: 'south',
        name: 'Southern India',
        match: byName([
          'tamil nadu',
          'karnataka',
          'kerala',
          'andhra pradesh',
          'telangana',
          'puducherry',
          'pondicherry',
          'lakshadweep',
        ]),
        weight: { pop: 0.22, eco: 0.28 },
      },
      {
        slug: 'east',
        name: 'Eastern India',
        match: byName(['west bengal', 'bihar', 'jharkhand', 'odisha', 'orissa']),
        weight: { pop: 0.22, eco: 0.12 },
      },
      {
        slug: 'west',
        name: 'Western India',
        match: byName(['maharashtra', 'gujarat', 'rajasthan', 'goa', 'daman', 'dadra', 'nagar']),
        weight: { pop: 0.2, eco: 0.3 },
      },
      {
        slug: 'central',
        name: 'Central India',
        match: byName(['madhya pradesh', 'chhattisgarh']),
        weight: { pop: 0.07, eco: 0.05 },
      },
      {
        slug: 'northeast',
        name: 'Northeast India',
        match: byName([
          'assam',
          'meghalaya',
          'manipur',
          'mizoram',
          'tripura',
          'nagaland',
          'arunachal',
          'sikkim',
        ]),
        weight: { pop: 0.04, eco: 0.02 },
      },
      { slug: '_rest', name: 'Inner India', match: fallback(), weight: { pop: 0.0, eco: 0.05 } },
    ],
  },

  // ── Argentina ────────────────────────────────────────────────────────────
  ARG: {
    isoNumeric: '032',
    parentName: 'Argentina',
    color: '#6aaed6',
    totalPop: 46,
    totalDef: 4,
    totalEco: 630,
    totalTech: 6,
    regions: [
      {
        slug: 'buenos_aires',
        name: 'Buenos Aires Region',
        match: byName(['buenos aires', 'ciudad aut\u00f3noma', 'ciudad autonoma']),
        weight: { pop: 0.5, eco: 0.6 },
      },
      {
        slug: 'pampas',
        name: 'Pampas',
        match: byName([
          'c\u00f3rdoba',
          'cordoba',
          'santa fe',
          'entre r\u00edos',
          'entre rios',
          'la pampa',
        ]),
        weight: { pop: 0.22, eco: 0.2 },
      },
      {
        slug: 'north',
        name: 'Northern Argentina',
        match: byName([
          'tucum\u00e1n',
          'tucuman',
          'salta',
          'jujuy',
          'santiago del estero',
          'catamarca',
          'la rioja',
          'mendoza',
          'san juan',
          'san luis',
          'misiones',
          'corrientes',
          'chaco',
          'formosa',
        ]),
        weight: { pop: 0.22, eco: 0.14 },
      },
      { slug: 'patagonia', name: 'Patagonia', match: fallback(), weight: { pop: 0.06, eco: 0.06 } },
    ],
  },

  // ── Kazakhstan ───────────────────────────────────────────────────────────
  KAZ: {
    isoNumeric: '398',
    parentName: 'Kazakhstan',
    color: '#4a90c8',
    totalPop: 19,
    totalDef: 4,
    totalEco: 190,
    totalTech: 5,
    regions: [
      {
        slug: 'west',
        name: 'Western Kazakhstan',
        match: byName(['mangystau', 'atyrau', 'west kazakhstan', 'aktobe', 'mangghystau']),
        weight: { pop: 0.25, eco: 0.4 },
      },
      {
        slug: 'central',
        name: 'Central Kazakhstan',
        match: byName([
          'astana',
          'akmola',
          'karagandy',
          'karaganda',
          'kostanay',
          'pavlodar',
          'north kazakhstan',
        ]),
        weight: { pop: 0.4, eco: 0.35 },
      },
      {
        slug: 'south_east',
        name: 'Southeast Kazakhstan',
        match: fallback(),
        weight: { pop: 0.35, eco: 0.25 },
      },
    ],
  },

  // ── Indonesia ────────────────────────────────────────────────────────────
  IDN: {
    isoNumeric: '360',
    parentName: 'Indonesia',
    color: '#a83030',
    totalPop: 275,
    totalDef: 5,
    totalEco: 1300,
    totalTech: 5,
    regions: [
      {
        slug: 'java',
        name: 'Java',
        match: byName(['jakarta', 'jawa', 'java', 'banten', 'yogyakarta']),
        weight: { pop: 0.55, eco: 0.58 },
      },
      {
        slug: 'sumatra',
        name: 'Sumatra',
        match: byName([
          'sumatera',
          'sumatra',
          'aceh',
          'riau',
          'jambi',
          'bengkulu',
          'lampung',
          'bangka',
        ]),
        weight: { pop: 0.21, eco: 0.22 },
      },
      {
        slug: 'kalimantan',
        name: 'Kalimantan',
        match: byName(['kalimantan']),
        weight: { pop: 0.06, eco: 0.09 },
      },
      {
        slug: 'eastern',
        name: 'Eastern Indonesia',
        match: fallback(),
        weight: { pop: 0.18, eco: 0.11 },
      },
    ],
  },
};

// List of ISO numeric codes that get subdivided (for filtering from country-level data)
export const SUBDIVIDED_ISO_CODES = new Set(
  Object.values(SUBDIVIDE_COUNTRIES).map((c) => c.isoNumeric)
);
