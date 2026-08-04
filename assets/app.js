const fallbackRecords = (window.LPA_2568_DATA && window.LPA_2568_DATA.records) || [];
let records = fallbackRecords;
let dataSourceLabel = "เชื่อมข้อมูลสดจาก Google Sheets";
let dataSourceMode = "loading";
let availableYears = [Number((window.LPA_CONFIG || {}).defaultYear || 2568)];
let countrySummaries = [];
let generatedAt = "";
const recordsByYear = new Map();
const liveCachedYears = new Set();
let trendPreloadPromise = null;
let browserCachePromise = null;
const browserCachedYears = new Set();
const BROWSER_CACHE_DB = "lpa-dashboard-cache";
const BROWSER_CACHE_STORE = "yearPayloads";

const els = {
  year: document.getElementById("yearFilter"),
  region: document.getElementById("regionFilter"),
  province: document.getElementById("provinceFilter"),
  district: document.getElementById("districtFilter"),
  type: document.getElementById("typeFilter"),
  search: document.getElementById("searchInput"),
  reset: document.getElementById("resetFilters"),
  mobileFilterToggle: document.getElementById("mobileFilterToggle"),
  mobileFilterSummary: document.getElementById("mobileFilterSummary"),
  mobileFilterBackdrop: document.getElementById("mobileFilterBackdrop"),
  filterBand: document.querySelector(".filter-band"),
  pageSize: document.getElementById("pageSize"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  pageInfo: document.getElementById("pageInfo"),
  caption: document.getElementById("filterCaption"),
  rankView: document.getElementById("rankView"),
  rankMetric: document.getElementById("rankMetric"),
  rankPrev: document.getElementById("rankPrev"),
  rankNext: document.getElementById("rankNext"),
  rankPageInfo: document.getElementById("rankPageInfo"),
  kpiTotalCard: document.getElementById("kpiTotalCard"),
  kpi44Card: document.getElementById("kpi44Card"),
  kpi45Card: document.getElementById("kpi45Card"),
  kpiWatchCard: document.getElementById("kpiWatchCard"),
  kpiTotalLabel: document.getElementById("kpiTotalLabel"),
  kpi44Label: document.getElementById("kpi44Label"),
  kpi45Label: document.getElementById("kpi45Label"),
  kpiFollowLabel: document.getElementById("kpiFollowLabel"),
  kpiTotal: document.getElementById("kpiTotal"),
  kpiScope: document.getElementById("kpiScope"),
  kpi44Rate: document.getElementById("kpi44Rate"),
  kpi44Detail: document.getElementById("kpi44Detail"),
  kpi45Rate: document.getElementById("kpi45Rate"),
  kpi45Detail: document.getElementById("kpi45Detail"),
  kpiFollow: document.getElementById("kpiFollow"),
  kpiFollowDetail: document.getElementById("kpiFollowDetail"),
  yearContextNote: document.getElementById("yearContextNote"),
  mapPill: document.getElementById("mapPill"),
  thaiMapSvg: document.getElementById("thaiMapSvg"),
  mapLegend: document.getElementById("mapLegend"),
  mapModeLabel: document.getElementById("mapModeLabel"),
  mapFocusTitle: document.getElementById("mapFocusTitle"),
  mapFocusDetail: document.getElementById("mapFocusDetail"),
  mapResetView: document.getElementById("mapResetView"),
  regionChart: document.getElementById("regionChart"),
  regionChartTitle: document.getElementById("regionChartTitle"),
  trendChart: document.getElementById("trendChart"),
  provinceRanking: document.getElementById("provinceRanking"),
  statusChart: document.getElementById("statusChart"),
  districtPanel: document.getElementById("districtPanel"),
  districtCount: document.getElementById("districtCount"),
  districtSummary: document.getElementById("districtSummary"),
  table: document.getElementById("lpaTable"),
  tableCount: document.getElementById("tableCount"),
  updatedAt: document.getElementById("updatedAtText"),
  footerDataStatus: document.getElementById("footerDataStatus"),
  loadingOverlay: document.getElementById("loadingOverlay"),
  loadingTitle: document.getElementById("loadingTitle"),
  loadingText: document.getElementById("loadingText"),
  retryLoad: document.getElementById("retryLoad"),
};

const quickButtons = [...document.querySelectorAll(".quick-filter")];

const statusOrder = [
  "ผ่านตามฐานประเมิน",
  "ต้องติดตามด้านสถานศึกษา",
  "ต้องติดตามด้าน อปท.",
  "ต้องติดตามทั้งสองด้าน",
];

const statusColors = {
  "ผ่านตามฐานประเมิน": "var(--green)",
  "ต้องติดตามด้านสถานศึกษา": "var(--amber)",
  "ต้องติดตามด้าน อปท.": "var(--teal)",
  "ต้องติดตามทั้งสองด้าน": "var(--red)",
};

const mapMetricStyles = {
  all: { label: "ร้อยละผ่านภาพรวม", light: "#dff5f1", dark: "#00a6a6", border: "var(--teal)" },
  lpa: { label: "ร้อยละที่ต้องติดตามด้าน อปท.", light: "#e3f2fd", dark: "#1976d2", border: "var(--blue)" },
  school: { label: "ร้อยละที่ต้องติดตามด้านสถานศึกษา", light: "#fff4d8", dark: "#f5b82e", border: "var(--yellow)" },
  follow: { label: "ร้อยละที่ควรติดตามภาพรวม", light: "#fde9e7", dark: "#d94d45", border: "var(--red)" },
};

let mapBuilt = false;
let provinceBBoxes = {};

const state = {
  region: "",
  province: "",
  district: "",
  type: "",
  search: "",
  rankView: "best",
  rankMetric: "overall",
  rankPage: 1,
  rankPageSize: 5,
  quick: "all",
  page: 1,
  pageSize: 10,
  year: Number((window.LPA_CONFIG || {}).defaultYear || 2568),
};

if (fallbackRecords.length) {
  recordsByYear.set(state.year, fallbackRecords);
}

function setLoading(active, text = "กำลังเชื่อมข้อมูลจาก Google Sheets", options = {}) {
  document.body.classList.toggle("is-loading", active);
  if (!els.loadingOverlay) return;
  els.loadingOverlay.classList.toggle("is-visible", active);
  els.loadingOverlay.setAttribute("aria-hidden", active ? "false" : "true");
  if (active && els.loadingTitle && !options.keepTitle) els.loadingTitle.textContent = "กำลังโหลดข้อมูล";
  if (els.loadingText) els.loadingText.textContent = text;
  if (els.retryLoad) els.retryLoad.hidden = true;
}

function liveEndpoint(year = state.year) {
  const config = window.LPA_CONFIG || {};
  const baseUrl = (config.appsScriptUrl || "").trim();
  if (!baseUrl) return "";
  const url = new URL(baseUrl);
  url.searchParams.set("year", year || config.defaultYear || 2568);
  return url.toString();
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function cacheBustUrl(url, key = "t") {
  const nextUrl = new URL(url);
  nextUrl.searchParams.set(key, `${Date.now()}_${Math.floor(Math.random() * 100000)}`);
  return nextUrl.toString();
}

function timeoutAfter(ms, message) {
  return new Promise((_, reject) => {
    window.setTimeout(() => reject(new Error(message)), ms);
  });
}

function openBrowserCache() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (browserCachePromise) return browserCachePromise;
  browserCachePromise = new Promise((resolve) => {
    const request = indexedDB.open(BROWSER_CACHE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BROWSER_CACHE_STORE)) {
        db.createObjectStore(BROWSER_CACHE_STORE, { keyPath: "year" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn("Cannot open browser cache.", request.error);
      resolve(null);
    };
  });
  return browserCachePromise;
}

async function readBrowserCache(year) {
  const db = await openBrowserCache();
  if (!db) return null;
  const numericYear = Number(year);
  return new Promise((resolve) => {
    const tx = db.transaction(BROWSER_CACHE_STORE, "readonly");
    const request = tx.objectStore(BROWSER_CACHE_STORE).get(numericYear);
    request.onsuccess = () => {
      const entry = request.result;
      resolve(entry && entry.payload && Array.isArray(entry.payload.records) ? entry.payload : null);
    };
    request.onerror = () => resolve(null);
  });
}

async function writeBrowserCache(payload, year) {
  if (!payload || !Array.isArray(payload.records)) return;
  const db = await openBrowserCache();
  if (!db) return;
  const numericYear = Number(payload.year || year);
  try {
    const tx = db.transaction(BROWSER_CACHE_STORE, "readwrite");
    tx.objectStore(BROWSER_CACHE_STORE).put({
      year: numericYear,
      cachedAt: Date.now(),
      payload: { ...payload, year: numericYear },
    });
    browserCachedYears.add(numericYear);
  } catch (error) {
    console.warn("Cannot write browser cache.", error);
  }
}

function applyCachedPayload(payload, year) {
  const numericYear = Number(payload.year || year);
  records = payload.records;
  recordsByYear.set(numericYear, payload.records);
  browserCachedYears.add(numericYear);
  if (Array.isArray(payload.availableYears) && payload.availableYears.length) {
    availableYears = payload.availableYears.map(Number).filter((item) => Number.isFinite(item));
  }
  if (Array.isArray(payload.countrySummaries)) countrySummaries = payload.countrySummaries;
  generatedAt = payload.generatedAt || generatedAt;
  state.year = numericYear;
  dataSourceMode = "cache";
  dataSourceLabel = `ข้อมูลที่เคยโหลดไว้ในเครื่อง · ปี ${state.year}`;
}

function loadJsonp(url, timeoutMs = 18000) {
  return new Promise((resolve, reject) => {
    const callbackName = `lpaJsonp_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("JSONP load timed out"));
    }, timeoutMs);
    const cleanup = () => {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    };
    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };
    const jsonpUrl = new URL(cacheBustUrl(url, "jsonp_t"));
    jsonpUrl.searchParams.set("callback", callbackName);
    script.src = jsonpUrl.toString();
    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP load failed"));
    };
    document.head.appendChild(script);
  });
}

async function fetchLivePayload(url, timeoutMs = 18000) {
  try {
    const response = await Promise.race([
      fetch(url, { cache: "no-store" }),
      timeoutAfter(timeoutMs, "Fetch load timed out"),
    ]);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (fetchError) {
    return await loadJsonp(url, timeoutMs);
  }
}

function applyLivePayload(payload, year, options = {}) {
  if (!payload || !Array.isArray(payload.records)) {
    throw new Error("Live payload has no records array");
  }
  const payloadYear = Number(payload.year || year);
  recordsByYear.set(payloadYear, payload.records);
  liveCachedYears.add(payloadYear);
  if (Array.isArray(payload.availableYears) && payload.availableYears.length) {
    availableYears = payload.availableYears.map(Number).filter((item) => Number.isFinite(item));
  }
  if (Array.isArray(payload.countrySummaries)) {
    countrySummaries = payload.countrySummaries;
  }
  generatedAt = payload.generatedAt || generatedAt;
  if (options.applyCurrent !== false) {
    records = payload.records;
    state.year = payloadYear || Number((window.LPA_CONFIG || {}).defaultYear || 2568);
    dataSourceMode = "live";
    dataSourceLabel = `เชื่อมข้อมูลสดจาก Google Sheets · ปี ${state.year}`;
  }
}

function showLoadError(year = state.year) {
  dataSourceMode = "error";
  dataSourceLabel = `ยังโหลดข้อมูลสดไม่ได้ · ปี ${year}`;
  if (els.loadingTitle) els.loadingTitle.textContent = "ยังโหลดข้อมูลไม่ได้";
  setLoading(true, "ระบบเชื่อมข้อมูลจาก Google Sheets ไม่สำเร็จ ลองโหลดใหม่อีกครั้งได้", { keepTitle: true });
  if (els.retryLoad) els.retryLoad.hidden = false;
}

async function loadLiveRecords(year = state.year, options = {}) {
  const numericYear = Number(year);
  if (recordsByYear.has(numericYear) && liveCachedYears.has(numericYear)) {
    if (options.applyCurrent !== false) {
      records = recordsByYear.get(numericYear);
      state.year = numericYear;
      dataSourceMode = "live";
      dataSourceLabel = `เชื่อมข้อมูลสดจาก Google Sheets · ปี ${state.year}`;
    }
    return true;
  }
  const url = liveEndpoint(year);
  if (!url) return false;
  const attempts = Number(options.attempts || 1);
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const payload = await fetchLivePayload(url, attempt === 1 ? 52000 : 60000);
      applyLivePayload(payload, year, { applyCurrent: options.applyCurrent !== false });
      writeBrowserCache(payload, year);
      return true;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(900 * attempt);
    }
  }
  console.warn("Cannot load live LPA data.", lastError);
  if (!fallbackRecords.length) {
    dataSourceMode = "error";
    dataSourceLabel = `ยังโหลดข้อมูลสดไม่ได้ · ปี ${numericYear}`;
    return false;
  }
  console.warn("Using fallback LPA data.", lastError);
  records = fallbackRecords;
  dataSourceMode = "fallback";
  dataSourceLabel = "ข้อมูลสำรองจากไฟล์ cleaned · ปี 2568";
  state.year = Number((window.LPA_CONFIG || {}).defaultYear || 2568);
  return false;
}

async function loadYearForTrend(year) {
  const numericYear = Number(year);
  if (recordsByYear.has(numericYear)) return true;
  const cachedPayload = await readBrowserCache(numericYear);
  if (cachedPayload) {
    recordsByYear.set(numericYear, cachedPayload.records);
    browserCachedYears.add(numericYear);
    if (Array.isArray(cachedPayload.countrySummaries)) countrySummaries = cachedPayload.countrySummaries;
    if (cachedPayload.generatedAt) generatedAt = cachedPayload.generatedAt;
    return true;
  }
  const url = liveEndpoint(numericYear);
  if (!url) return false;
  try {
    const payload = await fetchLivePayload(url, 52000);
    if (!payload || !Array.isArray(payload.records)) return false;
    recordsByYear.set(numericYear, payload.records);
    liveCachedYears.add(numericYear);
    if (Array.isArray(payload.countrySummaries)) countrySummaries = payload.countrySummaries;
    if (payload.generatedAt) generatedAt = payload.generatedAt;
    writeBrowserCache(payload, numericYear);
    return true;
  } catch (error) {
    console.warn(`Cannot preload LPA data for ${numericYear}.`, error);
    return false;
  }
}

async function preloadTrendYears() {
  if (!availableYears.length) return;
  const yearsToLoad = availableYears
    .filter((year) => !recordsByYear.has(Number(year)))
    .sort((a, b) => Number(b) - Number(a));
  if (!yearsToLoad.length) return;
  for (const year of yearsToLoad) {
    let loaded = false;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      loaded = await loadYearForTrend(year);
      if (loaded) break;
      await sleep(attempt === 1 ? 8000 : 20000);
    }
    if (!loaded) console.warn(`Trend year ${year} is still unavailable after retry.`);
    render();
    await sleep(2500);
  }
}

function preloadTrendYearsInBackground() {
  if (trendPreloadPromise) return trendPreloadPromise;
  trendPreloadPromise = preloadTrendYears()
    .catch((error) => console.warn("Cannot preload trend years.", error))
    .finally(() => {
      trendPreloadPromise = null;
    });
  return trendPreloadPromise;
}

function renderWithTrendPreload() {
  render();
  preloadTrendYearsInBackground();
}

async function refreshLiveYearInBackground(year) {
  const numericYear = Number(year);
  try {
    const liveLoaded = await loadLiveRecords(numericYear, { applyCurrent: false });
    if (liveLoaded && Number(state.year) === numericYear) {
      records = recordsByYear.get(numericYear) || records;
      dataSourceMode = "live";
      dataSourceLabel = `เชื่อมข้อมูลสดจาก Google Sheets · ปี ${state.year}`;
      renderWithTrendPreload();
    }
  } catch (error) {
    console.warn(`Cannot refresh live data for ${numericYear}.`, error);
  }
}

function fmtInt(value) {
  return new Intl.NumberFormat("th-TH").format(value || 0);
}

function fmtPct(value) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("th-TH", { style: "percent", maximumFractionDigits: 1 }).format(value);
}

function fmtPctPlain(value) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(value * 100) + "%";
}

function fmtRateNumber(value) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value * 100);
}

function normalizeProvinceName(name) {
  if (!name) return "";
  return String(name).replace(/^จังหวัด/, "").replace(/\s+/g, "").trim();
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToCss(parts) {
  return `rgb(${parts.map((part) => Math.round(part)).join(",")})`;
}

function lerpColor(fromHex, toHex, amount) {
  const from = hexToRgb(fromHex);
  const to = hexToRgb(toHex);
  const t = Math.max(0, Math.min(1, Number.isFinite(amount) ? amount : 0));
  return rgbToCss(from.map((part, index) => part + (to[index] - part) * t));
}

function toRate(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function isComparableValue(value) {
  const text = String(value || "").trim().toLowerCase();
  return value === true || text === "ใช่" || text === "yes" || text === "true" || text === "1";
}

function uniq(items) {
  return [...new Set(items.filter((item) => item !== "" && item !== null && item !== undefined))];
}

function regionSort(a, b) {
  return Number(a) - Number(b);
}

function regionForProvince(province, sourceRecords = records) {
  if (!province) return "";
  const match = sourceRecords.find((record) => record.province === province && record.region);
  return match ? String(match.region) : "";
}

function setOptions(select, values, placeholder, currentValue, sortFn) {
  const sorted = [...values].sort(sortFn || ((a, b) => String(a).localeCompare(String(b), "th")));
  select.innerHTML = "";
  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  select.appendChild(first);
  sorted.forEach((value) => {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = select === els.region ? `เขตสุขภาพที่ ${value}` : value;
    select.appendChild(option);
  });
  select.value = sorted.map(String).includes(String(currentValue)) ? String(currentValue) : "";
}

function isSchoolComparable(record) {
  return record.schoolComparable === "ใช่";
}

function isPass(status) {
  return status === "ผ่าน";
}

function isSchoolOk(record) {
  if (!isSchoolComparable(record)) return true;
  return record.st45 === "ผ่าน" || record.st45 === "ตัดฐาน";
}

function recordOverall(record) {
  const lpaPass = isPass(record.st44);
  const schoolOk = isSchoolOk(record);
  if (lpaPass && schoolOk) return "ผ่านตามฐานประเมิน";
  if (!isSchoolComparable(record)) return "ต้องติดตามด้าน อปท.";
  if (!lpaPass && !schoolOk) return "ต้องติดตามทั้งสองด้าน";
  if (!lpaPass) return "ต้องติดตามด้าน อปท.";
  return "ต้องติดตามด้านสถานศึกษา";
}

function refreshYearOptions() {
  if (!els.year) return;
  const sortedYears = [...new Set(availableYears)].sort((a, b) => b - a);
  els.year.innerHTML = "";
  sortedYears.forEach((year) => {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = `ปี ${year}`;
    els.year.appendChild(option);
  });
  els.year.value = sortedYears.includes(Number(state.year)) ? String(state.year) : String(sortedYears[0] || state.year);
  state.year = Number(els.year.value || state.year);
}

function filterRecords(ignoreKey = "", sourceRecords = records) {
  const ignoreKeys = Array.isArray(ignoreKey) ? ignoreKey : [ignoreKey];
  const query = state.search.trim().toLowerCase();
  return sourceRecords.filter((record) => {
    if (!ignoreKeys.includes("region") && state.region && String(record.region) !== String(state.region)) return false;
    if (!ignoreKeys.includes("province") && state.province && record.province !== state.province) return false;
    if (!ignoreKeys.includes("district") && state.district && record.district !== state.district) return false;
    if (!ignoreKeys.includes("type") && state.type && record.type !== state.type) return false;
    if (!ignoreKeys.includes("quick") && state.quick !== "all") {
      const overall = recordOverall(record);
      if (state.quick === "follow" && overall === "ผ่านตามฐานประเมิน") return false;
      if (state.quick === "school" && overall !== "ต้องติดตามด้านสถานศึกษา" && overall !== "ต้องติดตามทั้งสองด้าน") return false;
      if (state.quick === "lpa" && overall !== "ต้องติดตามด้าน อปท." && overall !== "ต้องติดตามทั้งสองด้าน") return false;
    }
    if (!ignoreKeys.includes("search") && query) {
      const haystack = `${record.name} ${record.district} ${record.province} ${record.type}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function refreshFilterOptions() {
  refreshYearOptions();
  const regionBase = filterRecords("region");
  const provinceBase = filterRecords("province");
  const districtBase = filterRecords("district");
  const typeBase = filterRecords("type");

  setOptions(els.region, uniq(regionBase.map((r) => r.region)), "ทุกเขตสุขภาพ", state.region, regionSort);
  state.region = els.region.value;
  setOptions(els.province, uniq(provinceBase.map((r) => r.province)), "ทุกจังหวัด", state.province);
  state.province = els.province.value;
  setOptions(els.district, uniq(districtBase.map((r) => r.district)), "ทุกอำเภอ", state.district);
  state.district = els.district.value;
  setOptions(els.type, uniq(typeBase.map((r) => r.type)), "ทุกประเภท", state.type);
  state.type = els.type.value;
}

function summarize(items) {
  const total = items.length;
  const pass44 = items.filter((r) => r.st44 === "ผ่าน").length;
  const fail44 = items.filter((r) => r.st44 === "ไม่ผ่าน").length;
  const schoolItems = items.filter(isSchoolComparable);
  const cut45 = schoolItems.filter((r) => r.st45 === "ตัดฐาน").length;
  const missing45 = schoolItems.filter((r) => r.st45 === "ไม่มีข้อมูล").length;
  const denominator45 = schoolItems.filter((r) => r.st45 !== "ตัดฐาน" && r.st45 !== "ไม่มีข้อมูล").length;
  const pass45 = schoolItems.filter((r) => r.st45 === "ผ่าน").length;
  const fail45 = schoolItems.filter((r) => r.st45 === "ไม่ผ่าน").length;
  const passOverall = items.filter((r) => recordOverall(r) === "ผ่านตามฐานประเมิน").length;
  const follow = total - passOverall;
  return {
    total,
    pass44,
    fail44,
    rate44: total ? pass44 / total : NaN,
    cut45,
    missing45,
    denominator45,
    pass45,
    fail45,
    rate45: denominator45 ? pass45 / denominator45 : NaN,
    passOverall,
    rateOverall: total ? passOverall / total : NaN,
    follow,
  };
}

function followBreakdown(items) {
  return items.reduce((acc, record) => {
    const lpaFollow = !isPass(record.st44);
    const schoolFollow = isSchoolComparable(record) && !isSchoolOk(record);
    if (lpaFollow) acc.lpa += 1;
    if (schoolFollow) acc.school += 1;
    if (lpaFollow && schoolFollow) acc.both += 1;
    if (lpaFollow && !schoolFollow) acc.lpaOnly += 1;
    if (!lpaFollow && schoolFollow) acc.schoolOnly += 1;
    return acc;
  }, { lpa: 0, school: 0, both: 0, lpaOnly: 0, schoolOnly: 0 });
}

function schoolFollowBase(summary) {
  return summary.denominator45 + summary.missing45;
}

function currentMapMetric() {
  return mapMetricStyles[state.quick] || mapMetricStyles.all;
}

function mapValueForSummary(summary) {
  if (state.quick === "lpa") {
    return {
      value: summary.total ? summary.fail44 / summary.total * 100 : NaN,
      note: `${fmtInt(summary.fail44)} ไม่ผ่าน จากทั้งหมด ${fmtInt(summary.total)} อปท.`,
    };
  }
  if (state.quick === "school") {
    const base = schoolFollowBase(summary);
    const follow = summary.fail45 + summary.missing45;
    return {
      value: base ? follow / base * 100 : NaN,
      note: `${fmtInt(follow)} ต้องติดตาม จากฐาน ${fmtInt(base)} แห่ง`,
    };
  }
  if (state.quick === "follow") {
    return {
      value: summary.total ? summary.follow / summary.total * 100 : NaN,
      note: `${fmtInt(summary.follow)} ควรติดตาม · ผ่านภาพรวม ${fmtInt(summary.passOverall)} แห่ง`,
    };
  }
  return {
    value: summary.rateOverall * 100,
    note: `${fmtInt(summary.passOverall)} ผ่านภาพรวม จากทั้งหมด ${fmtInt(summary.total)} อปท.`,
  };
}

function provinceMapStats(sourceRecords) {
  const map = new Map();
  sourceRecords.forEach((record) => {
    const key = normalizeProvinceName(record.province);
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(record);
  });
  return new Map([...map.entries()].map(([province, rows]) => {
    const summary = summarize(rows);
    summary.rows = rows;
    const metric = mapValueForSummary(summary);
    return [province, { province, region: rows[0]?.region || "", ...summary, mapValue: metric.value, mapNote: metric.note }];
  }));
}

function buildThailandMap() {
  if (mapBuilt || !els.thaiMapSvg || !window.THAILAND_PROVINCE_PATHS) return;
  const { paths = {}, nameMap = {}, viewBox = "0 0 480 700" } = window.THAILAND_PROVINCE_PATHS;
  els.thaiMapSvg.innerHTML = "";
  els.thaiMapSvg.setAttribute("viewBox", viewBox);
  Object.entries(paths).forEach(([pathKey, d]) => {
    const province = nameMap[pathKey] || pathKey;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.dataset.pathKey = pathKey;
    path.dataset.province = province;
    path.addEventListener("click", () => {
      const nextProvince = state.province === province ? "" : province;
      state.region = nextProvince ? regionForProvince(nextProvince) : (state.region || regionForProvince(province));
      state.province = nextProvince;
      state.district = "";
      state.search = "";
      state.page = 1;
      state.rankPage = 1;
      if (els.search) els.search.value = "";
      setMobileFilterOpen(false);
      render();
    });
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = province;
    path.appendChild(title);
    els.thaiMapSvg.appendChild(path);
  });
  const labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  labelGroup.id = "thaiMapLabelGroup";
  els.thaiMapSvg.appendChild(labelGroup);
  provinceBBoxes = {};
  els.thaiMapSvg.querySelectorAll("path").forEach((path) => {
    const box = path.getBBox();
    provinceBBoxes[normalizeProvinceName(path.dataset.province)] = { x: box.x, y: box.y, width: box.width, height: box.height };
  });
  mapBuilt = true;
}

function unionBoxes(provinces) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  provinces.forEach((province) => {
    const box = provinceBBoxes[province];
    if (!box) return;
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  });
  return Number.isFinite(minX) ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY } : null;
}

function setMapViewBox(targetBox) {
  if (!els.thaiMapSvg) return 480;
  if (!targetBox) {
    els.thaiMapSvg.setAttribute("viewBox", "0 0 480 700");
    return 480;
  }
  const pad = 0.18;
  const padX = targetBox.width * pad;
  const padY = targetBox.height * pad;
  const width = targetBox.width + padX * 2;
  const height = targetBox.height + padY * 2;
  els.thaiMapSvg.setAttribute("viewBox", `${targetBox.x - padX} ${targetBox.y - padY} ${width} ${height}`);
  return width;
}

function renderMapLabels(labelStats, viewWidth) {
  const labelGroup = document.getElementById("thaiMapLabelGroup");
  if (!labelGroup) return;
  labelGroup.innerHTML = "";
  const nameSize = Math.max(3.2, 11 * (viewWidth / 480));
  const valueSize = Math.max(3.2, 12 * (viewWidth / 480));
  labelStats.forEach((stat) => {
    const box = provinceBBoxes[stat.province];
    if (!box) return;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const name = document.createElementNS("http://www.w3.org/2000/svg", "text");
    name.setAttribute("class", "map-label");
    name.setAttribute("x", cx);
    name.setAttribute("y", cy - nameSize * 0.25);
    name.setAttribute("font-size", nameSize);
    name.textContent = stat.province;
    const value = document.createElementNS("http://www.w3.org/2000/svg", "text");
    value.setAttribute("class", "map-label map-label-value");
    value.setAttribute("x", cx);
    value.setAttribute("y", cy + valueSize * 0.9);
    value.setAttribute("font-size", valueSize);
    value.textContent = Number.isFinite(stat.mapValue) ? `${stat.mapValue.toFixed(1)}%` : "-";
    labelGroup.appendChild(name);
    labelGroup.appendChild(value);
  });
}

function updateThailandMap() {
  if (!els.thaiMapSvg || !window.THAILAND_PROVINCE_PATHS) return;
  buildThailandMap();
  const focusRegion = state.region || regionForProvince(state.province);
  const mapRecords = focusRegion
    ? filterRecords(["region", "province", "quick"]).filter((record) => String(record.region) === String(focusRegion))
    : filterRecords(["region", "province", "quick"]);
  const stats = provinceMapStats(mapRecords);
  const metric = currentMapMetric();
  const values = [...stats.values()].map((item) => item.mapValue).filter(Number.isFinite);
  const min = values.length ? Math.min(...values) : NaN;
  const max = values.length ? Math.max(...values) : NaN;
  const provinceRegions = new Map();
  records.forEach((record) => {
    const key = normalizeProvinceName(record.province);
    if (key && record.region && !provinceRegions.has(key)) provinceRegions.set(key, String(record.region));
  });

  els.thaiMapSvg.querySelectorAll("path").forEach((path) => {
    const province = normalizeProvinceName(path.dataset.province);
    const stat = stats.get(province);
    const inRegion = !focusRegion || provinceRegions.get(province) === String(focusRegion);
    const selected = state.province && normalizeProvinceName(state.province) === province;
    const t = Number.isFinite(stat?.mapValue) && Number.isFinite(min) && Number.isFinite(max) && max > min
      ? (stat.mapValue - min) / (max - min)
      : (Number.isFinite(stat?.mapValue) ? 0.55 : 0);
    path.setAttribute("fill", stat ? lerpColor(metric.light, metric.dark, t) : "#e9eef1");
    path.classList.toggle("is-muted", Boolean(focusRegion) && !inRegion);
    path.classList.toggle("is-selected", Boolean(selected));
    const title = path.querySelector("title") || document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = stat
      ? `${stat.province} · ${metric.label} ${Number.isFinite(stat.mapValue) ? stat.mapValue.toFixed(1) + "%" : "-"} · ${stat.mapNote}`
      : `${path.dataset.province} · ไม่มีข้อมูล`;
    if (!path.contains(title)) path.appendChild(title);
  });

  const visibleStats = [...stats.values()].filter((item) => !focusRegion || String(item.region) === String(focusRegion));
  const targetBox = state.province
    ? provinceBBoxes[normalizeProvinceName(state.province)]
    : (focusRegion ? unionBoxes(visibleStats.map((item) => item.province)) : null);
  const viewWidth = setMapViewBox(targetBox);
  const labelStats = state.province
    ? visibleStats.filter((item) => item.province === normalizeProvinceName(state.province))
    : (focusRegion ? visibleStats : []);
  renderMapLabels(labelStats, viewWidth);

  if (els.mapLegend) {
    els.mapLegend.style.setProperty("--legend-from", metric.light);
    els.mapLegend.style.setProperty("--legend-to", metric.dark);
    els.mapLegend.innerHTML = `<span>${Number.isFinite(min) ? min.toFixed(1) : "-"}</span><div class="map-legend-bar"></div><span>${Number.isFinite(max) ? max.toFixed(1) : "-"}%</span>`;
  }

  if (els.mapModeLabel) els.mapModeLabel.textContent = metric.label;
  if (els.mapFocusTitle) {
    els.mapFocusTitle.textContent = state.province || (focusRegion ? `เขตสุขภาพที่ ${focusRegion}` : "ประเทศไทย");
  }
  if (els.mapFocusDetail) {
    const selectedStat = state.province ? stats.get(normalizeProvinceName(state.province)) : summarize(mapRecords);
    if (state.province && selectedStat) {
      els.mapFocusDetail.textContent = `${selectedStat.mapNote} · อปท.ทั้งหมด ${fmtInt(selectedStat.total)} แห่ง`;
    } else {
      const countProvince = uniq(mapRecords.map((record) => record.province)).length;
      els.mapFocusDetail.textContent = `แสดง ${fmtInt(countProvince)} จังหวัด · ${metric.label} ตามเงื่อนไขตัวกรองปัจจุบัน คลิกจังหวัดเพื่อกรองรายละเอียด`;
    }
  }
  if (els.mapResetView) {
    els.mapResetView.disabled = !state.region && !state.province && !state.district;
  }
  if (els.mapPill) {
    els.mapPill.textContent = `${fmtInt(visibleStats.length || uniq(mapRecords.map((record) => record.province)).length)} จังหวัด`;
  }
  const border = metric.border || "var(--teal)";
  const insight = document.querySelector(".map-insight");
  if (insight) insight.style.borderLeftColor = border;
}

function scopeLabel() {
  const parts = [];
  if (state.region) parts.push(`เขตสุขภาพที่ ${state.region}`);
  if (state.province) parts.push(state.province);
  if (state.district) parts.push(state.district);
  if (state.type) parts.push(state.type);
  return parts.length ? parts.join(" · ") : "ภาพรวมประเทศ";
}

function quickLabel() {
  const active = quickButtons.find((button) => button.dataset.quick === state.quick);
  return active ? active.textContent.trim() : "ทั้งหมด";
}

function updateMobileFilterSummary() {
  if (!els.mobileFilterSummary) return;
  const area = state.district || state.province || (state.region ? `เขต ${state.region}` : "ทุกพื้นที่");
  els.mobileFilterSummary.textContent = `ปี ${state.year} · ${area} · ${quickLabel()}`;
}

function setMobileFilterOpen(open) {
  if (!els.filterBand || !els.mobileFilterToggle || !els.mobileFilterBackdrop) return;
  els.filterBand.classList.toggle("is-mobile-open", open);
  els.mobileFilterBackdrop.classList.toggle("is-visible", open);
  els.mobileFilterToggle.setAttribute("aria-expanded", open ? "true" : "false");
  document.body.classList.toggle("has-mobile-filter-open", open);
}

function scopedRecordsForYear(year) {
  const source = recordsByYear.get(Number(year));
  return source ? filterRecords("", source) : null;
}

function previousSummary() {
  const previousYear = Number(state.year) - 1;
  const previousRecords = scopedRecordsForYear(previousYear);
  if (!previousRecords) return null;
  return { year: previousYear, ...summarize(previousRecords) };
}

function deltaHtml(current, previous, previousYear, suffix = "จุด") {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return "";
  const diff = (current - previous) * 100;
  if (Math.abs(diff) < 0.05) {
    return `<span class="kpi-delta is-flat">0.0 ${suffix} จากปี ${previousYear}</span>`;
  }
  const direction = diff > 0 ? "▲" : "▼";
  const cls = diff > 0 ? "is-up" : "is-down";
  return `<span class="kpi-delta ${cls}">${direction} ${Math.abs(diff).toFixed(1)} ${suffix} จากปี ${previousYear}</span>`;
}

function countDeltaHtml(current, previous, previousYear) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return "";
  const diff = current - previous;
  if (diff === 0) return `<span class="kpi-delta is-flat">เท่ากับปี ${previousYear}</span>`;
  const direction = diff > 0 ? "▲" : "▼";
  const cls = diff > 0 ? "is-up" : "is-down";
  return `<span class="kpi-delta ${cls}">${direction} ${fmtInt(Math.abs(diff))} แห่ง จากปี ${previousYear}</span>`;
}

function followDeltaHtml(current, previous, previousYear) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return "";
  const diff = current - previous;
  if (diff === 0) return `<span class="kpi-delta is-flat">เท่ากับปี ${previousYear}</span>`;
  const percent = previous > 0 ? ` (${((Math.abs(diff) / previous) * 100).toFixed(1)}%)` : "";
  const improved = diff < 0;
  const direction = improved ? "▼" : "▲";
  const cls = improved ? "is-up" : "is-down";
  const verb = improved ? "ลดลง" : "เพิ่มขึ้น";
  return `<span class="kpi-delta ${cls}">${direction} ${verb} ${fmtInt(Math.abs(diff))} แห่ง${percent} จากปี ${previousYear}</span>`;
}

function formatUpdatedAt(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function setKpiCard(card, label, value, detail, accentClass, visible = true) {
  card.el.hidden = !visible;
  if (!visible) return;
  card.el.classList.remove("kpi-total", "kpi-44", "kpi-45", "kpi-watch");
  card.el.classList.add(accentClass);
  card.label.textContent = label;
  card.value.textContent = value;
  card.detail.innerHTML = detail;
}

function updateKpis(items) {
  const s = summarize(items);
  const prev = previousSummary();
  const schoolComparable = hasComparableSchoolData(items);
  const schoolNote = schoolModeNote(items);
  const baseItems = filterRecords("quick");
  const base = summarize(baseItems);
  const currentBreakdown = followBreakdown(items);
  const schoolBase = schoolFollowBase(base);
  const cards = {
    total: { el: els.kpiTotalCard, label: els.kpiTotalLabel, value: els.kpiTotal, detail: els.kpiScope },
    lpa: { el: els.kpi44Card, label: els.kpi44Label, value: els.kpi44Rate, detail: els.kpi44Detail },
    school: { el: els.kpi45Card, label: els.kpi45Label, value: els.kpi45Rate, detail: els.kpi45Detail },
    watch: { el: els.kpiWatchCard, label: els.kpiFollowLabel, value: els.kpiFollow, detail: els.kpiFollowDetail },
  };

  if (state.quick === "lpa") {
    setKpiCard(cards.total, "ต้องติดตามด้าน อปท.", fmtInt(s.total), `${scopeLabel()}`, "kpi-44");
    setKpiCard(cards.lpa, "สัดส่วนต่อ อปท. ทั้งหมด", fmtPct(base.total ? s.total / base.total : NaN), `${fmtInt(s.total)} จากทั้งหมด ${fmtInt(base.total)} แห่ง`, "kpi-44");
    setKpiCard(cards.school, "", "", "", "kpi-45", false);
    setKpiCard(cards.watch, "", "", "", "kpi-watch", false);
  } else if (state.quick === "school") {
    setKpiCard(cards.total, "ต้องติดตามด้านสถานศึกษา", fmtInt(s.total), `${scopeLabel()}`, "kpi-45");
    setKpiCard(cards.lpa, "สัดส่วนต่อฐานด้านสถานศึกษา", fmtPct(schoolBase ? s.total / schoolBase : NaN), `${fmtInt(s.total)} จากฐานที่ต้องพิจารณา ${fmtInt(schoolBase)} แห่ง`, "kpi-45");
    setKpiCard(cards.school, "", "", "", "kpi-45", false);
    setKpiCard(cards.watch, "", "", "", "kpi-watch", false);
  } else if (state.quick === "follow") {
    setKpiCard(cards.total, "อปท. ที่ควรติดตามทั้งหมด", fmtInt(s.total), `${scopeLabel()}`, "kpi-watch");
    setKpiCard(cards.lpa, "ติดตามด้าน อปท.", fmtInt(currentBreakdown.lpa), `${fmtPct(base.total ? currentBreakdown.lpa / base.total : NaN)} ของ อปท. ทั้งหมด ${fmtInt(base.total)} แห่ง`, "kpi-44");
    setKpiCard(cards.school, "ติดตามด้านสถานศึกษา", fmtInt(currentBreakdown.school), `${fmtPct(schoolBase ? currentBreakdown.school / schoolBase : NaN)} ของฐานด้านสถานศึกษา ${fmtInt(schoolBase)} แห่ง`, "kpi-45");
    setKpiCard(cards.watch, "ไม่ผ่านทั้งสองด้าน", fmtInt(currentBreakdown.both), `${fmtPct(base.total ? currentBreakdown.both / base.total : NaN)} ของ อปท. ทั้งหมด`, "kpi-watch");
  } else {
    setKpiCard(cards.total, "อปท. ทั้งหมด", fmtInt(s.total), `${scopeLabel()}${prev ? countDeltaHtml(s.total, prev.total, prev.year) : ""}`, "kpi-total");
    setKpiCard(cards.lpa, "ด้าน อปท. ควบคุมผลิตภัณฑ์ยาสูบ", fmtPct(s.rate44), `${fmtInt(s.pass44)} ผ่าน · ${fmtInt(s.fail44)} ไม่ผ่าน จากทั้งหมด ${fmtInt(s.total)}${prev ? deltaHtml(s.rate44, prev.rate44, prev.year) : ""}`, "kpi-44");
    setKpiCard(cards.school, "ด้านสถานศึกษา (อปท.) ควบคุมผลิตภัณฑ์ยาสูบ", schoolComparable ? fmtPct(s.rate45) : "ไม่มีข้อมูล", schoolComparable
      ? `${fmtInt(s.pass45)} ผ่าน · ${fmtInt(s.fail45)} ไม่ผ่าน จากฐานประเมิน ${fmtInt(s.denominator45)} · ตัดฐาน ${fmtInt(s.cut45)} · ไม่มีข้อมูล ${fmtInt(s.missing45)}${prev ? deltaHtml(s.rate45, prev.rate45, prev.year) : ""}${schoolNote ? `<span class="kpi-note">${schoolNote}</span>` : ""}`
      : schoolNote, "kpi-45");
    setKpiCard(cards.watch, "อปท. ที่ควรติดตาม", fmtInt(s.follow), `ผ่านภาพรวม ${fmtInt(s.passOverall)} แห่ง${prev ? followDeltaHtml(s.follow, prev.follow, prev.year) : ""}<span class="kpi-note">${overallBasisText(items)}</span>`, "kpi-watch");
  }
  els.caption.textContent = "";
  if (els.updatedAt) els.updatedAt.textContent = `วันที่อัปเดตข้อมูล: ${formatUpdatedAt(generatedAt)}`;
  if (els.footerDataStatus) els.footerDataStatus.textContent = dataSourceLabel || "เชื่อมข้อมูลสดจาก Google Sheets";
  els.mapPill.textContent = `${fmtInt(uniq(items.map((r) => r.province)).length)} จังหวัด`;
}

function updateQuickButtons() {
  quickButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.quick === state.quick);
  });
}

function updateRankMetricAvailability(items) {
  const schoolOption = [...els.rankMetric.options].find((option) => option.value === "rate45");
  const schoolAvailable = hasComparableSchoolData(items);
  if (schoolOption) schoolOption.disabled = !schoolAvailable;
  if (!schoolAvailable && state.rankMetric === "rate45") {
    state.rankMetric = "overall";
    els.rankMetric.value = "overall";
  }
}

function groupBy(items, key) {
  const map = new Map();
  items.forEach((item) => {
    const group = item[key] || "ไม่ระบุ";
    if (!map.has(group)) map.set(group, []);
    map.get(group).push(item);
  });
  return [...map.entries()];
}

function hasComparableSchoolData(items) {
  return items.some((item) => isSchoolComparable(item));
}

function schoolModeNote(items) {
  if (hasComparableSchoolData(items)) {
    const phases = uniq(items.map((item) => item.schoolPhase)).filter(Boolean);
    return phases.includes("นำร่อง") ? "ข้อมูลด้านสถานศึกษาเป็นช่วงนำร่อง" : "";
  }
  return "ปีนี้ไม่มีข้อมูลเปรียบเทียบด้านสถานศึกษา";
}

function overallBasisText(items) {
  if (!items.length) return "ไม่มีข้อมูลในเงื่อนไขนี้";
  return hasComparableSchoolData(items)
    ? "คำนวณจากด้าน อปท. และด้านสถานศึกษา"
    : "คำนวณจากด้าน อปท. เท่านั้น";
}

function yearContextMessage(items) {
  if (!items.length) return "";
  const year = Number(state.year);
  const messages = [];
  if (state.quick === "lpa") {
    messages.push("กำลังแสดงเฉพาะ อปท. ที่ต้องติดตามด้าน อปท. โดยเทียบสัดส่วนกับ อปท. ทั้งหมดในเงื่อนไขเดียวกัน");
  } else if (state.quick === "school") {
    messages.push("กำลังแสดงเฉพาะ อปท. ที่ต้องติดตามด้านสถานศึกษา โดยเทียบสัดส่วนกับฐานด้านสถานศึกษาในเงื่อนไขเดียวกัน");
  } else if (state.quick === "follow") {
    messages.push("กำลังแสดงเฉพาะ อปท. ที่ควรติดตามอย่างน้อย 1 ด้าน");
  }
  if (!hasComparableSchoolData(items)) {
    messages.push("ปีนี้ประเมินภาพรวมจากด้าน อปท. เท่านั้น เนื่องจากไม่มีข้อมูลสถานศึกษาแบบเปรียบเทียบได้");
    return messages.join(" · ");
  }
  if (year === 2567) {
    messages.push("ปี 2567 เป็นข้อมูลนำร่องด้านสถานศึกษา จึงควรอ่านการเปรียบเทียบข้ามปีกับปี 2565-2566 อย่างระมัดระวัง");
  }
  return messages.join(" · ");
}

function updateYearContext(items) {
  if (!els.yearContextNote) return;
  const message = yearContextMessage(items);
  els.yearContextNote.textContent = message;
  els.yearContextNote.hidden = !message;
}

function updateRegionChart(items) {
  const grouped = groupBy(items, "region")
    .filter(([region]) => region !== "ไม่ระบุ")
    .sort((a, b) => Number(a[0]) - Number(b[0]));

  if (!grouped.length) {
    els.regionChart.innerHTML = `<p class="empty">ไม่มีข้อมูลในเงื่อนไขนี้</p>`;
    return;
  }

  const width = 1280;
  const height = 430;
  const margin = { top: 56, right: 34, bottom: 64, left: 70 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const groupW = plotW / grouped.length;
  const barW = Math.min(38, groupW * 0.34);
  const y = (rate) => margin.top + plotH - Math.max(0, Math.min(1, rate || 0)) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const barPath = (x, topY, w, h, radius = 4) => {
    const r = Math.min(radius, w / 2, h);
    const bottomY = topY + h;
    return `M${x},${bottomY} L${x},${topY + r} Q${x},${topY} ${x + r},${topY} L${x + w - r},${topY} Q${x + w},${topY} ${x + w},${topY + r} L${x + w},${bottomY} Z`;
  };

  const grid = ticks.map((tick) => {
    const yy = y(tick);
    return `
      <line class="grid-line" x1="${margin.left}" y1="${yy}" x2="${width - margin.right}" y2="${yy}"></line>
      <text class="axis-text" x="${margin.left - 10}" y="${yy + 4}" text-anchor="end">${Math.round(tick * 100)}</text>
    `;
  }).join("");

  const bars = grouped.map(([region, rows], index) => {
    const s = summarize(rows);
    const showSchool = s.denominator45 > 0;
    const selected = state.region && String(region) === String(state.region);
    const muted = state.region && !selected;
    const xCenter = margin.left + index * groupW + groupW / 2;
    const x44 = showSchool ? xCenter - barW - 3 : xCenter - barW / 2;
    const x45 = xCenter + 3;
    const y44 = y(s.rate44);
    const y45 = y(s.rate45);
    const h44 = margin.top + plotH - y44;
    const h45 = margin.top + plotH - y45;
    const label44Y = Math.max(14, y44 - 8);
    const label45Y = Math.max(28, y45 - 8);
    return `
      ${selected ? `<rect class="region-highlight" x="${xCenter - groupW / 2 + 8}" y="${margin.top - 18}" width="${groupW - 16}" height="${plotH + 34}" rx="8"></rect>` : ""}
      <path class="region-bar-44 ${muted ? "is-muted" : ""}" d="${barPath(x44, y44, barW, h44)}"></path>
      ${showSchool ? `<path class="region-bar-45 ${muted ? "is-muted" : ""}" d="${barPath(x45, y45, barW, h45)}"></path>` : ""}
      <text class="bar-value-label ${muted ? "is-muted" : ""}" x="${x44 + barW / 2}" y="${label44Y}" text-anchor="middle">${fmtRateNumber(s.rate44)}</text>
      ${showSchool ? `<text class="bar-value-label ${muted ? "is-muted" : ""}" x="${x45 + barW / 2}" y="${label45Y}" text-anchor="middle">${fmtRateNumber(s.rate45)}</text>` : ""}
      <text class="axis-text ${selected ? "is-selected" : ""}" x="${xCenter}" y="${height - 18}" text-anchor="middle">${region}</text>
    `;
  }).join("");

  els.regionChart.innerHTML = `
    <svg class="region-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="กราฟแท่งร้อยละ แกน X คือเขตสุขภาพ แกน Y คือร้อยละ">
      ${grid}
      <line class="axis-line" x1="${margin.left}" y1="${margin.top + plotH}" x2="${width - margin.right}" y2="${margin.top + plotH}"></line>
      <line class="axis-line" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotH}"></line>
      ${bars}
      <text class="axis-text" x="20" y="${margin.top + plotH / 2}" text-anchor="middle" transform="rotate(-90 20 ${margin.top + plotH / 2})">ร้อยละ</text>
      <text class="axis-text" x="${margin.left + plotW / 2}" y="${height - 2}" text-anchor="middle">เขตสุขภาพ</text>
    </svg>
  `;
}

function updateTrendChart(items) {
  const cachedYears = availableYears.filter((year) => recordsByYear.has(Number(year))).sort((a, b) => Number(a) - Number(b));
  const hasActiveFilter = Boolean(state.region || state.province || state.district || state.type || state.search || state.quick !== "all");
  const summaries = cachedYears.length && (hasActiveFilter || cachedYears.length === availableYears.length)
    ? cachedYears.map((year) => {
      const yearItems = filterRecords("", recordsByYear.get(Number(year)));
      const s = summarize(yearItems);
      return {
        year,
        lpa_side_pass_rate: s.rate44,
        school_side_pass_rate: s.rate45,
        school_side_comparable: hasComparableSchoolData(yearItems) ? "ใช่" : "ไม่ใช่",
      };
    })
    : countrySummaries.length
      ? [...countrySummaries].sort((a, b) => Number(a.year) - Number(b.year))
      : [{ year: state.year, lpa_side_pass_rate: summarize(items).rate44, school_side_pass_rate: summarize(items).rate45, school_side_comparable: hasComparableSchoolData(items) ? "ใช่" : "ไม่ใช่" }];
  const width = 1180;
  const height = 420;
  const margin = { top: 64, right: 82, bottom: 58, left: 70 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const years = summaries.map((row) => Number(row.year));
  const x = (index) => margin.left + (summaries.length === 1 ? plotW / 2 : index * (plotW / (summaries.length - 1)));
  const y = (rate) => margin.top + plotH - Math.max(0, Math.min(1, rate || 0)) * plotH;
  const toRate = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  };
  const points44 = summaries
    .map((row, index) => ({ x: x(index), y: y(toRate(row.lpa_side_pass_rate)), rate: toRate(row.lpa_side_pass_rate), year: row.year }))
    .filter((point) => Number.isFinite(point.rate));
  const points45 = summaries
    .map((row, index) => ({ x: x(index), y: y(toRate(row.school_side_pass_rate)), rate: toRate(row.school_side_pass_rate), year: row.year, comparable: row.school_side_comparable === "ใช่" }))
    .filter((point) => point.comparable && Number.isFinite(point.rate));
  const path = (points) => points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const pilotIndex = years.findIndex((year) => Number(year) === 2567);
  const pilotX = pilotIndex >= 0 ? x(pilotIndex) : null;
  const valueLabel = (point, series, pointIndex) => {
    const paired = series === "school"
      ? points44.find((item) => Number(item.year) === Number(point.year))
      : points45.find((item) => Number(item.year) === Number(point.year));
    const nearPair = paired && Math.abs(paired.y - point.y) < 30;
    const lastPoint = Number(point.year) === Math.max(...years);
    let dy;
    if (series === "school") {
      dy = nearPair ? 28 : 24;
    } else {
      dy = nearPair ? -22 : -14;
    }
    let xShift = 0;
    if (pointIndex === 0) xShift = 18;
    if (lastPoint) xShift = -16;
    return `<text class="trend-value trend-value-${series}" x="${point.x + xShift}" y="${point.y + dy}" text-anchor="middle">${fmtRateNumber(point.rate)}</text>`;
  };
  els.trendChart.innerHTML = `
    <svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="กราฟเส้นแนวโน้มร้อยละผ่านรายปี">
      ${ticks.map((tick) => {
        const yy = y(tick);
        return `
          <line class="trend-grid" x1="${margin.left}" y1="${yy}" x2="${width - margin.right}" y2="${yy}"></line>
          <text class="trend-label" x="${margin.left - 8}" y="${yy + 4}" text-anchor="end">${Math.round(tick * 100)}</text>
        `;
      }).join("")}
      <line class="trend-axis" x1="${margin.left}" y1="${margin.top + plotH}" x2="${width - margin.right}" y2="${margin.top + plotH}"></line>
      <line class="trend-axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotH}"></line>
      ${pilotX !== null ? `<line class="trend-marker" x1="${pilotX}" y1="${margin.top}" x2="${pilotX}" y2="${margin.top + plotH}"></line><text class="trend-marker-label" x="${pilotX + 12}" y="${margin.top + 22}">เริ่มข้อมูลสถานศึกษานำร่อง</text>` : ""}
      <path class="trend-line-44" d="${path(points44)}"></path>
      ${points45.length > 1 ? `<path class="trend-line-45" d="${path(points45)}"></path>` : ""}
      ${points44.map((point, index) => `<circle class="trend-dot-44" cx="${point.x}" cy="${point.y}" r="6"></circle>${valueLabel(point, "lpa", index)}`).join("")}
      ${points45.map((point, index) => `<circle class="trend-dot-45" cx="${point.x}" cy="${point.y}" r="6"></circle>${valueLabel(point, "school", index)}`).join("")}
      ${years.map((year, index) => `<text class="trend-label" x="${x(index)}" y="${height - 12}" text-anchor="middle">${year}</text>`).join("")}
      <text class="trend-label" x="${margin.left + 6}" y="28">ร้อยละ</text>
      <text class="trend-label" x="${width - margin.right}" y="28" text-anchor="end">สถานศึกษาแสดงเฉพาะปีที่เทียบได้</text>
    </svg>
  `;
}

function provinceStats(items) {
  return groupBy(items, "province").map(([province, rows]) => {
    const s = summarize(rows);
    return { province, rows, ...s };
  });
}

function provinceRankLabel(s, pct, schoolFollow, schoolBase) {
  const metric = state.rankMetric;
  const view = state.rankView;
  if (view === "best") {
    if (metric === "rate44") {
      return `ผ่านด้าน อปท. ${fmtPct(s.rate44)} · ไม่ผ่าน ${fmtInt(s.fail44)}`;
    }
    if (metric === "rate45") {
      return `ผ่านด้านสถานศึกษา ${fmtPct(s.rate45)} · ต้องติดตาม ${fmtInt(schoolFollow)}`;
    }
    return `ผ่านภาพรวม ${fmtPct(s.rateOverall)} · ควรติดตาม ${fmtInt(s.follow)}`;
  }
  if (metric === "rate44") {
    return `ไม่ผ่านด้าน อปท. ${fmtInt(s.fail44)} แห่ง (${fmtPct(pct)}) จาก ${fmtInt(s.total)} อปท.`;
  }
  if (metric === "rate45") {
    return `ต้องติดตามด้านสถานศึกษา ${fmtInt(schoolFollow)} แห่ง (${fmtPct(pct)}) จากฐาน ${fmtInt(schoolBase)}`;
  }
  return `ควรติดตาม ${fmtInt(s.follow)} แห่ง (${fmtPct(pct)}) จาก ${fmtInt(s.total)} อปท.`;
}

function updateProvinceRanking(items) {
  const metric = state.rankMetric;
  const view = state.rankView;
  let stats = provinceStats(items).filter((s) => s.total > 0);
  const schoolFollowCount = (s) => s.fail45 + s.missing45;
  const schoolFollowRate = (s) => {
    const base = schoolFollowBase(s);
    return base ? schoolFollowCount(s) / base : NaN;
  };
  const metricValue = (s) => {
    if (view === "best") {
      if (metric === "rate44") return s.rate44;
      if (metric === "rate45") return s.rate45;
      return s.rateOverall;
    }
    if (metric === "rate44") return s.total ? s.fail44 / s.total : NaN;
    if (metric === "rate45") return schoolFollowRate(s);
    return s.total ? s.follow / s.total : NaN;
  };
  if (metric === "rate45") {
    stats = stats.filter((s) => Number.isFinite(metricValue(s)));
  }
  if (view === "best") {
    stats = stats.sort((a, b) => metricValue(b) - metricValue(a) || b.total - a.total);
  } else if (metric === "overall") {
    stats = stats.sort((a, b) => b.follow - a.follow || metricValue(b) - metricValue(a) || b.total - a.total);
  } else if (metric === "rate44") {
    stats = stats.sort((a, b) => b.fail44 - a.fail44 || metricValue(b) - metricValue(a) || b.total - a.total);
  } else if (metric === "rate45") {
    stats = stats.sort((a, b) => schoolFollowCount(b) - schoolFollowCount(a) || metricValue(b) - metricValue(a) || b.total - a.total);
  } else {
    stats = stats.sort((a, b) => b.follow - a.follow || b.total - a.total);
  }

  const totalPages = Math.max(1, Math.ceil(stats.length / state.rankPageSize));
  if (state.rankPage > totalPages) state.rankPage = totalPages;
  const start = (state.rankPage - 1) * state.rankPageSize;
  const shown = stats.slice(start, start + state.rankPageSize);
  els.rankPageInfo.textContent = `หน้า ${fmtInt(state.rankPage)} จาก ${fmtInt(totalPages)}`;
  els.rankPrev.disabled = state.rankPage <= 1;
  els.rankNext.disabled = state.rankPage >= totalPages;

  els.provinceRanking.innerHTML = shown.map((s, index) => {
    const pct = metricValue(s);
    const schoolBase = schoolFollowBase(s);
    const schoolFollow = schoolFollowCount(s);
    const pctWidth = Number.isFinite(pct) ? Math.max(2, Math.min(100, pct * 100)) : 0;
    let label = view === "best"
      ? metric === "overall"
        ? `ผ่านภาพรวม ${fmtPct(s.rateOverall)} · ควรติดตาม ${fmtInt(s.follow)}`
        : metric === "rate44"
          ? `ผ่านด้าน อปท. ${fmtPct(s.rate44)} · ไม่ผ่าน ${fmtInt(s.fail44)}`
          : `ผ่านด้านสถานศึกษา ${fmtPct(s.rate45)} · ไม่ผ่าน ${fmtInt(s.fail45)}`
      : metric === "overall"
        ? `ควรติดตาม ${fmtInt(s.follow)} แห่ง (${fmtPct(pct)}) จาก ${fmtInt(s.total)} อปท.`
        : metric === "rate44"
          ? `ผ่านด้าน อปท. ${fmtPct(s.rate44)} · ไม่ผ่าน ${fmtInt(s.fail44)}`
          : `ผ่านด้านสถานศึกษา ${fmtPct(s.rate45)} · ไม่ผ่าน ${fmtInt(s.fail45)}`;
    label = provinceRankLabel(s, pct, schoolFollow, schoolBase);
    return `
      <div class="rank-item ${view === "best" ? "rank-positive" : "rank-support"}">
        <span class="rank-no">${start + index + 1}</span>
        <div class="rank-title"><strong>${s.province}</strong><span>${fmtInt(s.total)} อปท.</span></div>
        <div class="rank-visual">
          <div class="mini-track"><div class="mini-fill" style="width:${pctWidth}%"></div></div>
          <div class="rank-value">${label}</div>
        </div>
      </div>
    `;
  }).join("") || `<p class="empty">ไม่มีข้อมูลในเงื่อนไขนี้</p>`;
}

function updateStatusChart(items) {
  const total = items.length || 1;
  const counts = Object.fromEntries(statusOrder.map((status) => [status, 0]));
  items.forEach((item) => {
    const overall = recordOverall(item);
    counts[overall] = (counts[overall] || 0) + 1;
  });

  let angle = 0;
  const stops = statusOrder.map((status) => {
    const start = angle;
    const size = counts[status] / total * 360;
    angle += size;
    return `${statusColors[status]} ${start}deg ${angle}deg`;
  }).join(", ");

  const legend = statusOrder.map((status) => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${statusColors[status]}"></span>
      <span>${status}</span>
      <strong>${fmtInt(counts[status])}</strong>
      <strong class="legend-percent">${fmtPct(counts[status] / total)}</strong>
    </div>
  `).join("");

  els.statusChart.innerHTML = `
    <div class="donut-wrap">
      <div class="donut" style="background:conic-gradient(${stops})" role="img" aria-label="สัดส่วนสถานะรวม"></div>
      <div class="legend-list">${legend}</div>
    </div>
  `;
}

function activeMetricSeries() {
  if (state.quick === "lpa") {
    return [{ key: "44", label: "ติดตามด้าน อปท.", color: "var(--blue)" }];
  }
  if (state.quick === "school") {
    return [{ key: "45", label: "ติดตามด้านสถานศึกษา", color: "var(--yellow)" }];
  }
  if (state.quick === "follow") {
    return [{ key: "watch", label: "อปท. ที่ควรติดตาม", color: "var(--red)" }];
  }
  return [
    { key: "44", label: "ด้าน อปท.", color: "var(--blue)" },
    { key: "45", label: "ด้านสถานศึกษา", color: "var(--yellow)" },
  ];
}

function metricRate(rows, key) {
  const s = summarize(rows);
  const breakdown = followBreakdown(rows);
  if (key === "44" && state.quick === "lpa") return s.total ? breakdown.lpa / s.total : NaN;
  if (key === "45" && state.quick === "school") {
    const base = schoolFollowBase(s);
    return base ? breakdown.school / base : NaN;
  }
  if (key === "watch") return s.total ? s.follow / s.total : NaN;
  if (key === "44") return s.rate44;
  if (key === "45") return s.rate45;
  return NaN;
}

function updateChartLegendsV2() {
  const series = activeMetricSeries();
  document.querySelectorAll(".chart-legend").forEach((legend) => {
    legend.innerHTML = series.map((item) => `
      <span><i class="legend-swatch swatch-${item.key}"></i>${item.label}</span>
    `).join("");
  });
}

function updateRegionChartV2(items, chartRegion = state.region) {
  const provinceMode = Boolean(chartRegion);
  const groupKey = provinceMode ? "province" : "region";
  const grouped = groupBy(items, groupKey)
    .filter(([label]) => label !== "ไม่ระบุ")
    .sort((a, b) => provinceMode
      ? String(a[0]).localeCompare(String(b[0]), "th")
      : Number(a[0]) - Number(b[0]));

  if (!grouped.length) {
    els.regionChart.innerHTML = `<p class="empty">ไม่มีข้อมูลในเงื่อนไขนี้</p>`;
    return;
  }

  if (els.regionChartTitle) {
    els.regionChartTitle.textContent = provinceMode
      ? `กราฟแท่งเปรียบเทียบผลการประเมินรายจังหวัดในเขตสุขภาพที่ ${chartRegion}`
      : "กราฟแท่งเปรียบเทียบผลการประเมินรายเขต";
  }

  const series = activeMetricSeries();
  const width = Math.max(1320, grouped.length * (provinceMode ? 210 : 110));
  const height = 460;
  const margin = { top: 58, right: 36, bottom: provinceMode ? 82 : 66, left: 72 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const groupW = plotW / grouped.length;
  const barGap = 8;
  const barW = Math.min(44, (groupW - barGap * (series.length + 1)) / Math.max(1, series.length));
  const y = (rate) => margin.top + plotH - Math.max(0, Math.min(1, rate || 0)) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const barPath = (x, topY, w, h, radius = 6) => {
    const r = Math.min(radius, w / 2, h);
    const bottomY = topY + h;
    return `M${x},${bottomY} L${x},${topY + r} Q${x},${topY} ${x + r},${topY} L${x + w - r},${topY} Q${x + w},${topY} ${x + w},${topY + r} L${x + w},${bottomY} Z`;
  };

  const grid = ticks.map((tick) => {
    const yy = y(tick);
    return `
      <line class="grid-line" x1="${margin.left}" y1="${yy}" x2="${width - margin.right}" y2="${yy}"></line>
      <text class="axis-text" x="${margin.left - 10}" y="${yy + 4}" text-anchor="end">${Math.round(tick * 100)}</text>
    `;
  }).join("");

  const bars = grouped.map(([label, rows], index) => {
    const selected = provinceMode ? state.province && String(label) === String(state.province) : false;
    const muted = provinceMode && state.province && !selected;
    const xCenter = margin.left + index * groupW + groupW / 2;
    const totalBarW = series.length * barW + (series.length - 1) * barGap;
    const labelY = provinceMode ? height - 32 : height - 20;
    return `
      ${selected ? `<rect class="region-highlight" x="${xCenter - groupW / 2 + 8}" y="${margin.top - 18}" width="${groupW - 16}" height="${plotH + 34}" rx="8"></rect>` : ""}
      ${series.map((item, seriesIndex) => {
        const rate = metricRate(rows, item.key);
        if (!Number.isFinite(rate)) return "";
        const xPos = xCenter - totalBarW / 2 + seriesIndex * (barW + barGap);
        const yPos = y(rate);
        const h = margin.top + plotH - yPos;
        const labelY = Math.max(16, yPos - 8);
        return `
          <path class="region-bar-${item.key} ${muted ? "is-muted" : ""}" d="${barPath(xPos, yPos, barW, h)}"></path>
          <text class="bar-value-label ${muted ? "is-muted" : ""}" x="${xPos + barW / 2}" y="${labelY}" text-anchor="middle">${fmtRateNumber(rate)}</text>
        `;
      }).join("")}
      <text class="axis-text axis-category-label ${selected ? "is-selected" : ""}" x="${xCenter}" y="${labelY}" text-anchor="middle">${label}</text>
    `;
  }).join("");

  els.regionChart.innerHTML = `
    <svg class="region-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${provinceMode ? `กราฟแท่งร้อยละตามจังหวัดในเขตสุขภาพที่ ${chartRegion}` : "กราฟแท่งร้อยละตามเขตสุขภาพ"}">
      ${grid}
      <line class="axis-line" x1="${margin.left}" y1="${margin.top + plotH}" x2="${width - margin.right}" y2="${margin.top + plotH}"></line>
      <line class="axis-line" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotH}"></line>
      ${bars}
      <text class="axis-text axis-title-label" x="22" y="${margin.top + plotH / 2}" text-anchor="middle" transform="rotate(-90 22 ${margin.top + plotH / 2})">ร้อยละ</text>
      <text class="axis-text axis-title-label" x="${margin.left + plotW / 2}" y="${height - 2}" text-anchor="middle">${provinceMode ? "จังหวัด" : "เขตสุขภาพ"}</text>
    </svg>
  `;
}

function updateTrendChartV2(items) {
  const cachedYears = availableYears.filter((year) => recordsByYear.has(Number(year))).sort((a, b) => Number(a) - Number(b));
  const hasActiveFilter = Boolean(state.region || state.province || state.district || state.type || state.search || state.quick !== "all");
  const useCountrySummary = !hasActiveFilter && countrySummaries.length;
  const isTrendComplete = useCountrySummary || cachedYears.length >= availableYears.length;
  const trendStatus = !isTrendComplete
    ? `<p class="trend-load-note">กำลังเติมข้อมูลรายปี (${fmtInt(cachedYears.length)} จาก ${fmtInt(availableYears.length)} ปี) กราฟจะปรับอัตโนมัติเมื่อข้อมูลครบ</p>`
    : "";
  const summaries = useCountrySummary
    ? [...countrySummaries].sort((a, b) => Number(a.year) - Number(b.year)).map((row) => ({
      year: row.year,
      rates: {
        "44": toRate(row.lpa_side_pass_rate),
        "45": isComparableValue(row.school_side_comparable) ? toRate(row.school_side_pass_rate) : NaN,
      },
    }))
    : cachedYears.length
      ? cachedYears.map((year) => ({ year, rows: filterRecords("quick", recordsByYear.get(Number(year))) }))
      : [{ year: state.year, rows: items }];
  const series = activeMetricSeries();
  const width = 1320;
  const height = 470;
  const margin = { top: 70, right: 88, bottom: 60, left: 76 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const years = summaries.map((row) => Number(row.year));
  const x = (index) => margin.left + (summaries.length === 1 ? plotW / 2 : index * (plotW / (summaries.length - 1)));
  const y = (rate) => margin.top + plotH - Math.max(0, Math.min(1, rate || 0)) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const pilotIndex = years.findIndex((year) => Number(year) === 2567);
  const pilotX = pilotIndex >= 0 ? x(pilotIndex) : null;
  const allPoints = series.map((item) => ({
    ...item,
    points: summaries.map((row, index) => {
      const rate = row.rates ? row.rates[item.key] : metricRate(row.rows, item.key);
      return { x: x(index), y: y(rate), rate, year: row.year };
    }).filter((point) => Number.isFinite(point.rate)),
  }));
  const path = (points) => points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
  const valueLabel = (point, item, pointIndex) => {
    const xShift = pointIndex === 0 ? 18 : pointIndex === summaries.length - 1 ? -18 : 0;
    const yShift = item.key === "45" ? 24 : -14;
    return `<text class="trend-value trend-value-${item.key}" x="${point.x + xShift}" y="${point.y + yShift}" text-anchor="middle">${fmtRateNumber(point.rate)}</text>`;
  };

  els.trendChart.innerHTML = `
    <svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="กราฟเส้นเปรียบเทียบผลการประเมินภาพรวมระดับประเทศ">
      ${ticks.map((tick) => {
        const yy = y(tick);
        return `
          <line class="trend-grid" x1="${margin.left}" y1="${yy}" x2="${width - margin.right}" y2="${yy}"></line>
          <text class="trend-label" x="${margin.left - 8}" y="${yy + 4}" text-anchor="end">${Math.round(tick * 100)}</text>
        `;
      }).join("")}
      <line class="trend-axis" x1="${margin.left}" y1="${margin.top + plotH}" x2="${width - margin.right}" y2="${margin.top + plotH}"></line>
      <line class="trend-axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotH}"></line>
      ${pilotX !== null ? `<line class="trend-marker" x1="${pilotX}" y1="${margin.top}" x2="${pilotX}" y2="${margin.top + plotH}"></line><text class="trend-marker-label" x="${pilotX + 12}" y="${margin.top + 22}">เริ่มข้อมูลสถานศึกษานำร่อง</text>` : ""}
      ${allPoints.map((item) => item.points.length > 1 ? `<path class="trend-line-${item.key}" d="${path(item.points)}"></path>` : "").join("")}
      ${allPoints.map((item) => item.points.map((point, index) => `<circle class="trend-dot-${item.key}" cx="${point.x}" cy="${point.y}" r="6"></circle>${valueLabel(point, item, index)}`).join("")).join("")}
      ${years.map((year, index) => `<text class="trend-label" x="${x(index)}" y="${height - 12}" text-anchor="middle">${year}</text>`).join("")}
      <text class="trend-label" x="${margin.left + 6}" y="30">ร้อยละ</text>
      <text class="trend-label" x="${width - margin.right}" y="30" text-anchor="end">${state.quick === "all" ? "ร้อยละผ่านรายปี" : "ร้อยละที่ต้องติดตามรายปี"}</text>
    </svg>
    ${trendStatus}
  `;
}

function updateStatusChartV2(items) {
  const baseItems = state.quick === "all" || state.quick === "follow" ? items : filterRecords("quick");
  let chartItems;
  if (state.quick === "lpa") {
    const s = summarize(baseItems);
    chartItems = [
      { label: "ผ่านด้าน อปท.", count: s.pass44, color: "var(--green)" },
      { label: "ต้องติดตามด้าน อปท.", count: s.fail44, color: "var(--blue)" },
    ];
  } else if (state.quick === "school") {
    const s = summarize(baseItems);
    chartItems = [
      { label: "ผ่านด้านสถานศึกษา", count: s.pass45, color: "var(--green)" },
      { label: "ต้องติดตามด้านสถานศึกษา", count: s.fail45 + s.missing45, color: "var(--yellow)" },
    ];
  } else if (state.quick === "follow") {
    const breakdown = followBreakdown(items);
    chartItems = [
      { label: "ติดตามด้าน อปท. เท่านั้น", count: breakdown.lpaOnly, color: "var(--blue)" },
      { label: "ติดตามด้านสถานศึกษาเท่านั้น", count: breakdown.schoolOnly, color: "var(--yellow)" },
      { label: "ติดตามทั้งสองด้าน", count: breakdown.both, color: "var(--red)" },
    ];
  } else {
    const counts = Object.fromEntries(statusOrder.map((status) => [status, 0]));
    items.forEach((item) => {
      const overall = recordOverall(item);
      counts[overall] = (counts[overall] || 0) + 1;
    });
    chartItems = statusOrder.map((status) => ({ label: status, count: counts[status], color: statusColors[status] }));
  }

  const total = chartItems.reduce((sum, item) => sum + item.count, 0) || 1;
  let angle = 0;
  const stops = chartItems.map((item) => {
    const start = angle;
    const size = item.count / total * 360;
    angle += size;
    return `${item.color} ${start}deg ${angle}deg`;
  }).join(", ");
  const legend = chartItems.map((item) => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${item.color}"></span>
      <span>${item.label}</span>
      <strong>${fmtInt(item.count)}</strong>
      <strong class="legend-percent">${fmtPct(item.count / total)}</strong>
    </div>
  `).join("");

  els.statusChart.innerHTML = `
    <div class="donut-wrap">
      <div class="donut" style="background:conic-gradient(${stops})" role="img" aria-label="สัดส่วนสถานะรวม"></div>
      <div class="legend-list">${legend}</div>
    </div>
  `;
}

function updateDistrictSummary(items) {
  if (!state.province) {
    els.districtPanel.style.display = "";
    els.districtCount.textContent = "เลือกจังหวัด";
    els.districtSummary.innerHTML = `
      <div class="district-empty">
        <span class="district-empty-icon" aria-hidden="true"></span>
        <strong>เลือกจังหวัดเพื่อดูรายอำเภอ</strong>
        <p>ใช้ตัวกรองจังหวัดด้านบน หรือคลิกจังหวัดบนแผนที่ประเทศไทย เพื่อแสดงผลการดำเนินงานของอำเภอในจังหวัดนั้น</p>
      </div>
    `;
    return;
  }
  els.districtPanel.style.display = "";
  const grouped = groupBy(items, "district")
    .filter(([district]) => district !== "ไม่ระบุ")
    .map(([district, rows]) => ({ district, ...summarize(rows) }))
    .sort((a, b) => b.follow - a.follow || b.total - a.total || a.district.localeCompare(b.district, "th"));
  els.districtCount.textContent = `${fmtInt(grouped.length)} อำเภอ`;
  els.districtSummary.innerHTML = grouped.slice(0, 12).map((item) => `
    <div class="district-item">
      <strong>${item.district}</strong>
      <span>${fmtInt(item.total)} อปท. · ต้องติดตาม ${fmtInt(item.follow)}</span>
      <span>อปท. ${fmtPct(item.rate44)} · สถานศึกษา ${fmtPct(item.rate45)}</span>
    </div>
  `).join("") || `<p class="empty">ไม่มีข้อมูลในเงื่อนไขนี้</p>`;
}

function badgeClass(status) {
  if (status === "ผ่าน") return "pass";
  if (status === "ตัดฐาน") return "cut";
  if (status === "ไม่มีข้อมูล") return "missing";
  if (status === "ok") return "ok";
  if (status === "ผ่านตามฐานประเมิน") return "pass";
  if (status === "ต้องติดตามทั้งสองด้าน") return "both";
  return "follow";
}

function scoreText(record, indicator) {
  if (indicator === "44") {
    return record.s44 === "" ? "ไม่มีข้อมูล" : `${record.s44} คะแนน`;
  }
  if (record.schoolComparable !== "ใช่") return "ไม่มีข้อมูลเปรียบเทียบ";
  if (record.st45 === "ตัดฐาน" || record.st45 === "ไม่มีข้อมูล") return record.st45;
  return `${record.s45} คะแนน`;
}

function schoolStatusLabel(record) {
  return record.schoolComparable === "ใช่" ? record.st45 : "ไม่เปรียบเทียบ";
}

function updateTable(items) {
  const priority = {
    "ต้องติดตามทั้งสองด้าน": 0,
    "ต้องติดตามด้านสถานศึกษา": 1,
    "ต้องติดตามด้าน อปท.": 2,
    "ผ่านตามฐานประเมิน": 3,
  };
  const usePrioritySort = Boolean(state.province || state.district);
  const sorted = [...items].sort((a, b) => {
    const aOverall = recordOverall(a);
    const bOverall = recordOverall(b);
    if (usePrioritySort) {
      return priority[aOverall] - priority[bOverall]
        || a.province.localeCompare(b.province, "th")
        || a.district.localeCompare(b.district, "th")
        || a.name.localeCompare(b.name, "th");
    }
    return a.province.localeCompare(b.province, "th")
      || a.district.localeCompare(b.district, "th")
      || priority[aOverall] - priority[bOverall]
      || a.name.localeCompare(b.name, "th");
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / state.pageSize));
  if (state.page > totalPages) state.page = totalPages;
  const start = (state.page - 1) * state.pageSize;
  const shown = sorted.slice(start, start + state.pageSize);
  const end = sorted.length ? start + shown.length : 0;
  els.tableCount.textContent = `แสดง ${fmtInt(start + 1)}-${fmtInt(end)} จาก ${fmtInt(items.length)} แถว`;
  els.pageInfo.textContent = `หน้า ${fmtInt(state.page)} จาก ${fmtInt(totalPages)}`;
  els.prevPage.disabled = state.page <= 1;
  els.nextPage.disabled = state.page >= totalPages;
  els.table.innerHTML = shown.map((record) => `
    <tr>
      <td class="area-cell">
        <strong>${record.province}</strong>
        <span>เขตสุขภาพที่ ${record.region}</span>
      </td>
      <td class="area-cell">
        <strong>${record.district}</strong>
      </td>
      <td class="name-cell">
        <strong>${record.name}</strong>
        <span>${record.type}</span>
      </td>
      <td>
        <span class="status-badge ${badgeClass(record.st44)}">${record.st44}</span>
        <div class="score-note">${scoreText(record, "44")}</div>
      </td>
      <td>
        <span class="status-badge ${badgeClass(schoolStatusLabel(record))}">${schoolStatusLabel(record)}</span>
        <div class="score-note">${scoreText(record, "45")}</div>
      </td>
      <td><span class="status-badge ${badgeClass(recordOverall(record))}">${recordOverall(record)}</span></td>
    </tr>
  `).join("") || `<tr><td colspan="6">ไม่มีข้อมูลในเงื่อนไขนี้</td></tr>`;
}

function render() {
  refreshFilterOptions();
  const items = filterRecords();
  const chartRegion = state.region || regionForProvince(state.province);
  const regionItems = chartRegion
    ? filterRecords(["region", "province", "district", "quick"]).filter((record) => String(record.region) === String(chartRegion))
    : filterRecords(["region", "quick"]);
  updateQuickButtons();
  updateMobileFilterSummary();
  updateChartLegendsV2();
  updateRankMetricAvailability(items);
  updateKpis(items);
  updateThailandMap();
  updateYearContext(items);
  updateRegionChartV2(regionItems, chartRegion);
  updateTrendChartV2(items);
  updateProvinceRanking(items);
  updateStatusChartV2(items);
  updateDistrictSummary(items);
  updateTable(items);
}

function updateStateFromControls() {
  state.region = els.region.value;
  state.province = els.province.value;
  state.district = els.district.value;
  state.type = els.type.value;
  state.search = els.search.value;
  state.rankView = els.rankView ? els.rankView.value : "best";
  state.rankMetric = els.rankMetric.value;
  state.page = 1;
  state.rankPage = 1;
  render();
}

[els.region, els.province, els.district, els.type, els.rankView, els.rankMetric].filter(Boolean).forEach((el) => {
  el.addEventListener("change", updateStateFromControls);
});
if (els.year) {
  els.year.addEventListener("change", async () => {
    const selectedYear = Number(els.year.value);
    Object.assign(state, { year: selectedYear, region: "", province: "", district: "", type: "", search: "", rankView: "best", rankMetric: "overall", rankPage: 1, quick: "all", page: 1, pageSize: 10 });
    els.search.value = "";
    if (els.rankView) els.rankView.value = "best";
    els.rankMetric.value = "overall";
    els.pageSize.value = "10";
    if (recordsByYear.has(selectedYear)) {
      records = recordsByYear.get(selectedYear);
      state.year = selectedYear;
      dataSourceMode = liveCachedYears.has(selectedYear) ? "live" : "cache";
      dataSourceLabel = liveCachedYears.has(selectedYear)
        ? `เชื่อมข้อมูลสดจาก Google Sheets · ปี ${state.year}`
        : `ข้อมูลที่เคยโหลดไว้ในเครื่อง · ปี ${state.year}`;
      renderWithTrendPreload();
      if (!liveCachedYears.has(selectedYear)) {
        refreshLiveYearInBackground(selectedYear);
      }
      return;
    }
    const cachedPayload = await readBrowserCache(selectedYear);
    if (cachedPayload) {
      applyCachedPayload(cachedPayload, selectedYear);
      renderWithTrendPreload();
      refreshLiveYearInBackground(selectedYear);
      return;
    }
    setLoading(true, `กำลังโหลดข้อมูลปี ${selectedYear}`);
    let keepLoadingOverlay = false;
    try {
      dataSourceMode = "loading";
      dataSourceLabel = `เชื่อมข้อมูลสดจาก Google Sheets · ปี ${selectedYear}`;
      const liveLoaded = await loadLiveRecords(selectedYear);
      if (liveLoaded || fallbackRecords.length) {
        renderWithTrendPreload();
      } else {
        showLoadError(selectedYear);
        keepLoadingOverlay = true;
      }
    } finally {
      if (!keepLoadingOverlay) setLoading(false);
    }
  });
}
els.search.addEventListener("input", updateStateFromControls);
quickButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.quick = button.dataset.quick;
    state.page = 1;
    state.rankPage = 1;
    render();
    if (window.matchMedia("(max-width: 760px)").matches) setMobileFilterOpen(false);
  });
});
if (els.mobileFilterToggle) {
  els.mobileFilterToggle.addEventListener("click", () => {
    const isOpen = els.filterBand && els.filterBand.classList.contains("is-mobile-open");
    setMobileFilterOpen(!isOpen);
  });
}
if (els.mobileFilterBackdrop) {
  els.mobileFilterBackdrop.addEventListener("click", () => setMobileFilterOpen(false));
}
if (els.mapResetView) {
  els.mapResetView.addEventListener("click", () => {
    Object.assign(state, { region: "", province: "", district: "", page: 1, rankPage: 1 });
    render();
  });
}
els.rankPrev.addEventListener("click", () => {
  state.rankPage = Math.max(1, state.rankPage - 1);
  render();
});
els.rankNext.addEventListener("click", () => {
  state.rankPage += 1;
  render();
});
els.pageSize.addEventListener("change", () => {
  state.pageSize = Number(els.pageSize.value);
  state.page = 1;
  render();
});
els.prevPage.addEventListener("click", () => {
  state.page = Math.max(1, state.page - 1);
  render();
});
els.nextPage.addEventListener("click", () => {
  state.page += 1;
  render();
});
els.reset.addEventListener("click", () => {
  Object.assign(state, { region: "", province: "", district: "", type: "", search: "", rankView: "best", rankMetric: "overall", rankPage: 1, quick: "all", page: 1, pageSize: 10 });
  els.search.value = "";
  if (els.rankView) els.rankView.value = "best";
  els.rankMetric.value = "overall";
  els.pageSize.value = "10";
  render();
  if (window.matchMedia("(max-width: 760px)").matches) setMobileFilterOpen(false);
});

if (els.retryLoad) {
  els.retryLoad.addEventListener("click", () => {
    initDashboard();
  });
}

async function initDashboard() {
  setLoading(true, `กำลังโหลดข้อมูลปี ${state.year}`);
  let keepLoadingOverlay = false;
  try {
    const cachedPayload = await readBrowserCache(state.year);
    if (cachedPayload) {
      applyCachedPayload(cachedPayload, state.year);
      state.page = 1;
      state.rankPage = 1;
      renderWithTrendPreload();
      setLoading(false);
      refreshLiveYearInBackground(state.year);
      return;
    }
    const liveLoaded = await loadLiveRecords();
    if (liveLoaded) {
      state.page = 1;
      state.rankPage = 1;
      renderWithTrendPreload();
    } else if (fallbackRecords.length) {
      render();
    } else {
      showLoadError(state.year);
      keepLoadingOverlay = true;
    }
  } finally {
    if (!keepLoadingOverlay) setLoading(false);
  }
  if (!records.length && !keepLoadingOverlay) {
    render();
  }
}

initDashboard();
