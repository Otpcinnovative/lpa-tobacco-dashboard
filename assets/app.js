const fallbackRecords = (window.LPA_2568_DATA && window.LPA_2568_DATA.records) || [];
let records = fallbackRecords;
let dataSourceLabel = "เชื่อมข้อมูลสดจาก Google Sheets";
let dataSourceMode = "loading";
let availableYears = [Number((window.LPA_CONFIG || {}).defaultYear || 2568)];
let countrySummaries = [];
let generatedAt = "";
let dataRevision = "";
const MANUAL_UPDATED_AT_LABEL = "5/08/2569";
const INDICATOR_DETAIL_DRIVE_URL = "https://drive.google.com/drive/folders/1PT0dfWKqrLW4yPtRN3UIi3d-HQgHyGNy?usp=sharing";
const recordsByYear = new Map();
const exportDetailRowsByYear = new Map();
const staticCachedYears = new Set();
const liveCachedYears = new Set();
let trendPreloadPromise = null;
let trendPreloadRunId = 0;
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
  searchSuggestions: document.getElementById("orgSearchSuggestions"),
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
  versionBadge: document.getElementById("versionBadge"),
  versionStatusDot: document.getElementById("versionStatusDot"),
  exportExcel: document.getElementById("exportExcel"),
  exportImagePreviewToggle: document.getElementById("exportImagePreviewToggle"),
  exportImagePreviewPanel: document.getElementById("exportImagePreviewPanel"),
  exportSlide: document.getElementById("exportSlide"),
  exportPreviewImage: document.getElementById("exportPreviewImage"),
  exportCanvas: document.getElementById("exportCanvas"),
  refreshExportPreview: document.getElementById("refreshExportPreview"),
  closeExportPreview: document.getElementById("closeExportPreview"),
  downloadExportPreview: document.getElementById("downloadExportPreview"),
  loadingOverlay: document.getElementById("loadingOverlay"),
  loadingTitle: document.getElementById("loadingTitle"),
  loadingText: document.getElementById("loadingText"),
  retryLoad: document.getElementById("retryLoad"),
};

const quickButtons = [...document.querySelectorAll(".quick-filter")];
const exportFormatButtons = [...document.querySelectorAll(".export-format-option")];

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
let orgSearchSuggestions = [];
let exportPreviewOpen = false;
let selectedExportFormat = "png";
let exportRenderToken = 0;

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

function dataStatusMeta() {
  if (dataSourceMode === "static") {
    return { className: "is-static", text: dataSourceLabel || "โหลดข้อมูลจากไฟล์ข้อมูลบน GitHub Pages" };
  }
  if (dataSourceMode === "live") {
    return { className: "is-live", text: dataSourceLabel || "โหลดข้อมูลสดจาก Google Sheets" };
  }
  if (dataSourceMode === "cache") {
    return { className: "is-cache", text: dataSourceLabel || "แสดงข้อมูลจาก Cache ในเครื่อง" };
  }
  if (dataSourceMode === "checking") {
    return { className: "is-checking", text: dataSourceLabel || "กำลังตรวจสอบข้อมูลล่าสุดจาก Google Sheets" };
  }
  if (dataSourceMode === "updating") {
    return { className: "is-updating", text: dataSourceLabel || "พบข้อมูลใหม่ กำลังอัปเดตข้อมูลในเครื่อง" };
  }
  if (dataSourceMode === "fallback") {
    return { className: "is-fallback", text: dataSourceLabel || "แสดงข้อมูลสำรอง" };
  }
  if (dataSourceMode === "error") {
    return { className: "is-error", text: dataSourceLabel || "ยังโหลดข้อมูลสดไม่ได้" };
  }
  return { className: "is-loading", text: dataSourceLabel || "กำลังโหลดข้อมูล" };
}

function updateDataStatusIndicator() {
  const meta = dataStatusMeta();
  if (els.versionStatusDot) {
    els.versionStatusDot.className = `version-status-dot ${meta.className}`;
  }
  if (els.versionBadge) {
    const label = `V4.3.1 draft · ${meta.text}`;
    els.versionBadge.setAttribute("title", meta.text);
    els.versionBadge.setAttribute("aria-label", label);
  }
  if (els.footerDataStatus) {
    els.footerDataStatus.hidden = true;
    els.footerDataStatus.textContent = "";
  }
}

function liveEndpoint(year = state.year) {
  const config = window.LPA_CONFIG || {};
  const baseUrl = (config.appsScriptUrl || "").trim();
  if (!baseUrl) return "";
  const url = new URL(baseUrl);
  url.searchParams.set("year", year || config.defaultYear || 2568);
  return url.toString();
}

function liveMetaEndpoint() {
  const config = window.LPA_CONFIG || {};
  const baseUrl = (config.appsScriptUrl || "").trim();
  if (!baseUrl) return "";
  const url = new URL(baseUrl);
  url.searchParams.set("meta", "1");
  return url.toString();
}

function staticDataEndpoint(fileName) {
  const config = window.LPA_CONFIG || {};
  const base = String(config.staticDataBase || "data").replace(/\/+$/, "");
  const version = String(config.staticDataVersion || "").trim();
  const url = `${base}/${fileName}`;
  return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}

function staticMetaEndpoint() {
  return staticDataEndpoint("meta.json");
}

function staticYearEndpoint(year = state.year) {
  return staticDataEndpoint(`${Number(year)}.json`);
}

function staticExportYearEndpoint(year = state.year) {
  return staticDataEndpoint(`export/${Number(year)}.json`);
}

function staticExportYearScriptEndpoint(year = state.year) {
  return staticDataEndpoint(`export/${Number(year)}.js`);
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

async function clearBrowserCache() {
  const db = await openBrowserCache();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(BROWSER_CACHE_STORE, "readwrite");
      tx.objectStore(BROWSER_CACHE_STORE).clear();
      tx.oncomplete = () => {
        browserCachedYears.clear();
        resolve();
      };
      tx.onerror = () => {
        console.warn("Cannot clear browser cache.", tx.error);
        resolve();
      };
    } catch (error) {
      console.warn("Cannot clear browser cache.", error);
      resolve();
    }
  });
}

function payloadRevision(payload) {
  if (!payload) return "";
  return payload.dataRevision || payload.dataUpdatedAt || payload.generatedAt || "";
}

function normalizeYearList(years) {
  return [...new Set((years || []).map(Number).filter((year) => Number.isFinite(year)))].sort((a, b) => a - b);
}

function sameYearList(a, b) {
  const left = normalizeYearList(a);
  const right = normalizeYearList(b);
  return left.length === right.length && left.every((year, index) => year === right[index]);
}

async function fetchLiveMeta() {
  const url = liveMetaEndpoint();
  if (!url) return null;
  try {
    const payload = await fetchLivePayload(url, 18000);
    return payload && payload.ok ? payload : null;
  } catch (error) {
    console.warn("Cannot load live LPA metadata.", error);
    return null;
  }
}

function applyLiveMeta(payload) {
  if (!payload) return;
  if (Array.isArray(payload.availableYears) && payload.availableYears.length) {
    availableYears = normalizeYearList(payload.availableYears);
  }
  if (Array.isArray(payload.countrySummaries)) {
    countrySummaries = payload.countrySummaries;
  }
  generatedAt = payload.generatedAt || generatedAt;
  dataRevision = payloadRevision(payload) || dataRevision;
}

function isCachedPayloadStale(cachedPayload, metaPayload) {
  if (!metaPayload) return false;
  const liveRevision = payloadRevision(metaPayload);
  const cachedRevision = payloadRevision(cachedPayload);
  if (liveRevision && cachedRevision && liveRevision !== cachedRevision) return true;
  if (liveRevision && !cachedRevision) return true;
  return !sameYearList(cachedPayload?.availableYears || availableYears, metaPayload.availableYears || []);
}

async function syncLiveMetaAfterCache(year, cachedPayload) {
  const previousMode = dataSourceMode;
  const previousLabel = dataSourceLabel;
  dataSourceMode = "checking";
  dataSourceLabel = `กำลังตรวจสอบข้อมูลล่าสุดจาก Google Sheets · ปี ${year}`;
  updateDataStatusIndicator();
  const metaPayload = await fetchLiveMeta();
  if (!metaPayload) {
    dataSourceMode = previousMode;
    dataSourceLabel = previousLabel;
    updateDataStatusIndicator();
    return;
  }
  const stale = isCachedPayloadStale(cachedPayload, metaPayload);
  const cachedSource = String(cachedPayload?.source || "");
  const shouldRefreshStaticSource = cachedSource && cachedSource !== "Static JSON";
  applyLiveMeta(metaPayload);
  if (!stale && !shouldRefreshStaticSource) {
    dataSourceMode = previousMode;
    dataSourceLabel = previousLabel;
    render();
    return;
  }

  dataSourceMode = "updating";
  dataSourceLabel = "พบข้อมูลใหม่จาก Google Sheets กำลังอัปเดตข้อมูลในเครื่อง";
  updateDataStatusIndicator();
  setLoading(true, "พบข้อมูลใหม่จาก Google Sheets กำลังอัปเดตข้อมูลในเครื่อง");
  await clearBrowserCache();
  recordsByYear.clear();
  liveCachedYears.clear();
  resetTrendPreloadQueue();
  const targetYear = availableYears.includes(Number(year)) ? Number(year) : Math.max(...availableYears);
  state.year = Number.isFinite(targetYear) ? targetYear : state.year;
  if (els.year) els.year.value = String(state.year);
  const liveLoaded = await loadLiveRecords(state.year, { forceLive: true, attempts: 2 });
  setLoading(false);
  if (liveLoaded) {
    state.page = 1;
    state.rankPage = 1;
    renderWithTrendPreload();
  } else {
    render();
  }
}

async function syncStaticMetaAfterCache(year, cachedPayload) {
  const previousMode = dataSourceMode;
  const previousLabel = dataSourceLabel;
  dataSourceMode = "checking";
  dataSourceLabel = `กำลังตรวจสอบข้อมูลล่าสุดจากไฟล์บน GitHub Pages · ปี ${year}`;
  updateDataStatusIndicator();
  const metaPayload = await fetchStaticMeta();
  if (!metaPayload) {
    dataSourceMode = previousMode;
    dataSourceLabel = previousLabel;
    updateDataStatusIndicator();
    syncLiveMetaAfterCache(year, cachedPayload);
    return;
  }
  const stale = isCachedPayloadStale(cachedPayload, metaPayload);
  applyLiveMeta(metaPayload);
  if (!stale) {
    dataSourceMode = previousMode;
    dataSourceLabel = previousLabel;
    render();
    return;
  }

  dataSourceMode = "updating";
  dataSourceLabel = "พบไฟล์ข้อมูลใหม่บน GitHub Pages กำลังอัปเดตข้อมูลในเครื่อง";
  updateDataStatusIndicator();
  setLoading(true, "พบไฟล์ข้อมูลใหม่บน GitHub Pages กำลังอัปเดตข้อมูลในเครื่อง");
  await clearBrowserCache();
  recordsByYear.clear();
  staticCachedYears.clear();
  liveCachedYears.clear();
  resetTrendPreloadQueue();
  const targetYear = availableYears.includes(Number(year)) ? Number(year) : Math.max(...availableYears);
  state.year = Number.isFinite(targetYear) ? targetYear : state.year;
  if (els.year) els.year.value = String(state.year);
  const staticLoaded = await loadStaticRecords(state.year, { forceStatic: true, timeoutMs: 20000 });
  setLoading(false);
  if (staticLoaded) {
    state.page = 1;
    state.rankPage = 1;
    renderWithTrendPreload();
  } else {
    render();
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
  dataRevision = payloadRevision(payload) || dataRevision;
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

async function fetchStaticPayload(url, timeoutMs = 15000) {
  const response = await Promise.race([
    fetch(url, { cache: "default" }),
    timeoutAfter(timeoutMs, "Static data load timed out"),
  ]);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

async function fetchStaticMeta() {
  try {
    const payload = await fetchStaticPayload(staticMetaEndpoint(), 12000);
    return payload && payload.ok ? payload : null;
  } catch (error) {
    console.warn("Cannot load static LPA metadata.", error);
    return null;
  }
}

function applyStaticPayload(payload, year, options = {}) {
  if (!payload || !Array.isArray(payload.records)) {
    throw new Error("Static payload has no records array");
  }
  const payloadYear = Number(payload.year || year);
  recordsByYear.set(payloadYear, payload.records);
  staticCachedYears.add(payloadYear);
  if (Array.isArray(payload.availableYears) && payload.availableYears.length) {
    availableYears = payload.availableYears.map(Number).filter((item) => Number.isFinite(item));
  }
  if (Array.isArray(payload.countrySummaries)) {
    countrySummaries = payload.countrySummaries;
  }
  generatedAt = payload.generatedAt || generatedAt;
  dataRevision = payloadRevision(payload) || dataRevision;
  if (options.applyCurrent !== false) {
    records = payload.records;
    state.year = payloadYear || Number((window.LPA_CONFIG || {}).defaultYear || 2568);
    dataSourceMode = "static";
    dataSourceLabel = `โหลดข้อมูลจากไฟล์บน GitHub Pages · ปี ${state.year}`;
  }
}

async function loadStaticRecords(year = state.year, options = {}) {
  const numericYear = Number(year);
  if (!options.forceStatic && recordsByYear.has(numericYear) && staticCachedYears.has(numericYear)) {
    if (options.applyCurrent !== false) {
      records = recordsByYear.get(numericYear);
      state.year = numericYear;
      dataSourceMode = "static";
      dataSourceLabel = `โหลดข้อมูลจากไฟล์บน GitHub Pages · ปี ${state.year}`;
    }
    return true;
  }
  try {
    const payload = await fetchStaticPayload(staticYearEndpoint(numericYear), options.timeoutMs || 18000);
    applyStaticPayload(payload, numericYear, { applyCurrent: options.applyCurrent !== false });
    writeBrowserCache(payload, numericYear);
    return true;
  } catch (error) {
    console.warn(`Cannot load static LPA data for ${numericYear}.`, error);
    return false;
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
  dataRevision = payloadRevision(payload) || dataRevision;
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
  updateDataStatusIndicator();
  if (els.loadingTitle) els.loadingTitle.textContent = "ยังโหลดข้อมูลไม่ได้";
  setLoading(true, "ระบบเชื่อมข้อมูลจาก Google Sheets ไม่สำเร็จ ลองโหลดใหม่อีกครั้งได้", { keepTitle: true });
  if (els.retryLoad) els.retryLoad.hidden = false;
}

async function loadLiveRecords(year = state.year, options = {}) {
  const numericYear = Number(year);
  if (!options.forceLive && recordsByYear.has(numericYear) && liveCachedYears.has(numericYear)) {
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
    dataRevision = payloadRevision(cachedPayload) || dataRevision;
    return true;
  }
  const staticLoaded = await loadStaticRecords(numericYear, { applyCurrent: false, timeoutMs: 18000 });
  if (staticLoaded) return true;
  const url = liveEndpoint(numericYear);
  if (!url) return false;
  try {
    const payload = await fetchLivePayload(url, 52000);
    if (!payload || !Array.isArray(payload.records)) return false;
    recordsByYear.set(numericYear, payload.records);
    liveCachedYears.add(numericYear);
    if (Array.isArray(payload.countrySummaries)) countrySummaries = payload.countrySummaries;
    if (payload.generatedAt) generatedAt = payload.generatedAt;
    dataRevision = payloadRevision(payload) || dataRevision;
    writeBrowserCache(payload, numericYear);
    return true;
  } catch (error) {
    console.warn(`Cannot preload LPA data for ${numericYear}.`, error);
    return false;
  }
}

function resetTrendPreloadQueue() {
  trendPreloadRunId += 1;
  trendPreloadPromise = null;
}

async function preloadTrendYears(runId = trendPreloadRunId) {
  if (!availableYears.length) return;
  const yearsToLoad = availableYears
    .filter((year) => !recordsByYear.has(Number(year)))
    .sort((a, b) => Number(b) - Number(a));
  if (!yearsToLoad.length) return;
  for (const year of yearsToLoad) {
    if (runId !== trendPreloadRunId) return;
    let loaded = false;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (runId !== trendPreloadRunId) return;
      loaded = await loadYearForTrend(year);
      if (loaded) break;
      await sleep(attempt === 1 ? 8000 : 20000);
    }
    if (runId !== trendPreloadRunId) return;
    if (!loaded) console.warn(`Trend year ${year} is still unavailable after retry.`);
    render();
    await sleep(2500);
  }
}

function preloadTrendYearsInBackground() {
  if (trendPreloadPromise) return trendPreloadPromise;
  const runId = trendPreloadRunId;
  trendPreloadPromise = preloadTrendYears(runId)
    .catch((error) => console.warn("Cannot preload trend years.", error))
    .finally(() => {
      if (runId === trendPreloadRunId) trendPreloadPromise = null;
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

function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .toLocaleLowerCase("th-TH")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

function syncRegionFromSelectedProvince() {
  if (!state.province) return;
  const matchedRegion = regionForProvince(state.province);
  if (matchedRegion) state.region = matchedRegion;
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
  const query = normalizeSearchText(state.search);
  const compactQuery = query.replace(/\s+/g, "");
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
      const haystack = normalizeSearchText(record.name);
      const compactHaystack = haystack.replace(/\s+/g, "");
      if (!haystack.includes(query) && (!compactQuery || !compactHaystack.includes(compactQuery))) return false;
    }
    return true;
  });
}

function hideOrgSearchSuggestions() {
  orgSearchSuggestions = [];
  if (els.searchSuggestions) {
    els.searchSuggestions.innerHTML = "";
    els.searchSuggestions.classList.remove("is-open");
  }
  if (els.search) els.search.setAttribute("aria-expanded", "false");
}

function renderOrgSearchSuggestions() {
  if (!els.search || !els.searchSuggestions) return;
  const query = normalizeSearchText(els.search.value);
  const compactQuery = query.replace(/\s+/g, "");
  if (!query) {
    state.search = "";
    hideOrgSearchSuggestions();
    render();
    return;
  }
  const baseItems = filterRecords("search");
  const seen = new Set();
  orgSearchSuggestions = [];
  baseItems.forEach((record) => {
    const name = normalizeSearchText(record.name);
    const compactName = name.replace(/\s+/g, "");
    if (!name.includes(query) && (!compactQuery || !compactName.includes(compactQuery))) return;
    const key = `${record.province}|${record.district}|${record.name}|${record.type}`;
    if (seen.has(key)) return;
    seen.add(key);
    orgSearchSuggestions.push(record);
  });
  orgSearchSuggestions = orgSearchSuggestions
    .sort((a, b) => a.province.localeCompare(b.province, "th")
      || a.district.localeCompare(b.district, "th")
      || a.name.localeCompare(b.name, "th")
      || a.type.localeCompare(b.type, "th"))
    .slice(0, 8);

  if (!orgSearchSuggestions.length) {
    els.searchSuggestions.innerHTML = `<div class="search-suggestion-empty">ไม่พบชื่อ อปท. ที่ตรงกับคำค้น</div>`;
  } else {
    els.searchSuggestions.innerHTML = orgSearchSuggestions.map((record, index) => `
      <button class="search-suggestion" type="button" role="option" data-index="${index}">
        <strong>${record.name}</strong>
        <span>${record.type} · ${record.district} · ${record.province}</span>
      </button>
    `).join("");
  }
  els.searchSuggestions.classList.add("is-open");
  els.search.setAttribute("aria-expanded", "true");
}

function selectOrgSearchSuggestion(index = 0) {
  const record = orgSearchSuggestions[index];
  if (!record || !els.search) return;
  state.region = String(record.region || regionForProvince(record.province));
  state.province = record.province;
  state.district = record.district;
  state.search = record.name;
  state.page = 1;
  state.rankPage = 1;
  els.search.value = record.name;
  hideOrgSearchSuggestions();
  setMobileFilterOpen(false);
  render();
}

function refreshFilterOptions() {
  refreshYearOptions();
  syncRegionFromSelectedProvince();
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
      hideOrgSearchSuggestions();
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

function setMapViewBox(targetBox, level = "country") {
  if (!els.thaiMapSvg) return 480;
  els.thaiMapSvg.classList.toggle("is-country-view", level === "country");
  els.thaiMapSvg.classList.toggle("is-region-view", level === "region");
  els.thaiMapSvg.classList.toggle("is-province-view", level === "province");
  if (!targetBox) {
    els.thaiMapSvg.setAttribute("viewBox", "0 0 480 700");
    return 480;
  }
  const pad = level === "region" ? 0.06 : 0.18;
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
  const mapLevel = state.province ? "province" : (focusRegion ? "region" : "country");
  const viewWidth = setMapViewBox(targetBox, mapLevel);
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
    const label = state.province || state.district ? "กลับมุมมองเขตสุขภาพ" : "กลับภาพรวมประเทศไทย";
    els.mapResetView.setAttribute("aria-label", label);
    els.mapResetView.setAttribute("title", label);
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
  if (els.updatedAt) els.updatedAt.textContent = `วันที่อัปเดตข้อมูล: ${MANUAL_UPDATED_AT_LABEL}`;
  updateDataStatusIndicator();
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
  const groupByAreaSort = Boolean(state.province || state.district);
  const sorted = [...items].sort((a, b) => {
    const aOverall = recordOverall(a);
    const bOverall = recordOverall(b);
    if (groupByAreaSort) {
      return a.province.localeCompare(b.province, "th")
        || a.district.localeCompare(b.district, "th")
        || priority[aOverall] - priority[bOverall]
        || a.name.localeCompare(b.name, "th")
        || a.type.localeCompare(b.type, "th");
    }
    return a.province.localeCompare(b.province, "th")
      || a.district.localeCompare(b.district, "th")
      || priority[aOverall] - priority[bOverall]
      || a.name.localeCompare(b.name, "th")
      || a.type.localeCompare(b.type, "th");
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

function excelEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function excelSheetName(name) {
  return String(name || "Sheet")
    .replace(/[\\/?*[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31) || "Sheet";
}

function exportFileSafe(value) {
  return String(value || "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function exportDateLabel() {
  return new Intl.DateTimeFormat("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
}

function exportRecordKey(record) {
  return [
    record.year || state.year,
    record.region,
    record.province,
    record.district,
    record.type,
    record.name,
  ].map((item) => normalizeSearchText(item).replace(/\s+/g, "")).join("|");
}

function exportDetailRecordKey(record) {
  return [
    record.year || state.year,
    record.region,
    record.province,
    record.district,
    record.type,
    record.name,
  ].map((item) => normalizeSearchText(item).replace(/\s+/g, "")).join("|");
}

function exportLooseRecordKey(record) {
  return [
    record.year || state.year,
    record.region,
    record.province,
    record.district,
    record.name,
  ].map((item) => normalizeSearchText(item).replace(/\s+/g, "")).join("|");
}

function loadExportDetailScript(year) {
  const numericYear = Number(year);
  window.LPA_EXPORT_DATA = window.LPA_EXPORT_DATA || {};
  if (window.LPA_EXPORT_DATA[numericYear]) {
    return Promise.resolve(window.LPA_EXPORT_DATA[numericYear]);
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = staticExportYearScriptEndpoint(numericYear);
    script.async = true;
    script.onload = () => {
      const payload = window.LPA_EXPORT_DATA && window.LPA_EXPORT_DATA[numericYear];
      if (payload) {
        resolve(payload);
      } else {
        reject(new Error(`Export detail script loaded without payload for ${numericYear}`));
      }
    };
    script.onerror = () => reject(new Error(`Cannot load export detail script for ${numericYear}`));
    document.head.appendChild(script);
  });
}

async function loadExportDetailRows(year = state.year) {
  const numericYear = Number(year);
  if (exportDetailRowsByYear.has(numericYear)) return exportDetailRowsByYear.get(numericYear);
  let payload = window.LPA_EXPORT_DATA && window.LPA_EXPORT_DATA[numericYear];
  if (!payload) {
    try {
      payload = await fetchStaticPayload(staticExportYearEndpoint(numericYear), 30000);
    } catch (error) {
      payload = await loadExportDetailScript(numericYear);
    }
  }
  const rows = payload && Array.isArray(payload.records) ? payload.records : [];
  exportDetailRowsByYear.set(numericYear, rows);
  return rows;
}

function matchExportDetailRows(items, detailRows) {
  const exactMap = new Map(detailRows.map((record) => [exportDetailRecordKey(record), record]));
  const looseMap = new Map();
  detailRows.forEach((record) => {
    const key = exportLooseRecordKey(record);
    if (!looseMap.has(key)) looseMap.set(key, record);
  });
  return items
    .map((item) => exactMap.get(exportRecordKey(item)) || looseMap.get(exportLooseRecordKey(item)))
    .filter(Boolean)
    .sort((a, b) => a.province.localeCompare(b.province, "th")
      || a.district.localeCompare(b.district, "th")
      || a.name.localeCompare(b.name, "th")
      || a.type.localeCompare(b.type, "th"));
}

function quickFilterLabel(value = state.quick) {
  const labels = {
    all: "ทั้งหมด",
    lpa: "ติดตามด้าน อปท.",
    school: "ติดตามด้านสถานศึกษา",
    follow: "เฉพาะที่ควรติดตาม",
  };
  return labels[value] || "ทั้งหมด";
}

function exportScopeLabel() {
  const parts = [`ปี ${state.year}`];
  if (state.region) parts.push(`เขตสุขภาพที่ ${state.region}`);
  if (state.province) parts.push(state.province);
  if (state.district) parts.push(state.district);
  if (state.type) parts.push(state.type);
  if (state.search) parts.push(`อปท. ${state.search}`);
  if (state.quick !== "all") parts.push(quickFilterLabel());
  return parts.join(" · ");
}

function sortedDetailRows(items) {
  const priority = {
    "ต้องติดตามทั้งสองด้าน": 0,
    "ต้องติดตามด้านสถานศึกษา": 1,
    "ต้องติดตามด้าน อปท.": 2,
    "ผ่านตามฐานประเมิน": 3,
  };
  return [...items].sort((a, b) => {
    const aOverall = recordOverall(a);
    const bOverall = recordOverall(b);
    return a.province.localeCompare(b.province, "th")
      || a.district.localeCompare(b.district, "th")
      || (priority[aOverall] ?? 9) - (priority[bOverall] ?? 9)
      || a.name.localeCompare(b.name, "th")
      || a.type.localeCompare(b.type, "th");
  });
}

function exportAreaGroups(items) {
  if (state.district) {
    return {
      level: "ประเภท อปท.",
      rows: groupBy(items, "type").map(([label, rows]) => ({ label, rows })),
      sort: (a, b) => a.label.localeCompare(b.label, "th"),
    };
  }
  if (state.province) {
    return {
      level: "อำเภอ",
      rows: groupBy(items, "district").map(([label, rows]) => ({ label, rows })),
      sort: (a, b) => a.label.localeCompare(b.label, "th"),
    };
  }
  if (state.region) {
    return {
      level: "จังหวัด",
      rows: groupBy(items, "province").map(([label, rows]) => ({ label, rows })),
      sort: (a, b) => a.label.localeCompare(b.label, "th"),
    };
  }
  return {
    level: "เขตสุขภาพ",
    rows: groupBy(items, "region").map(([label, rows]) => ({ label: `เขตสุขภาพที่ ${label}`, rows, sortValue: Number(label) })),
    sort: (a, b) => (a.sortValue || 0) - (b.sortValue || 0),
  };
}

function summaryExportRows(items) {
  const groups = exportAreaGroups(items);
  return groups.rows
    .sort(groups.sort)
    .map((group) => {
      const summary = summarize(group.rows);
      return [
        groups.level,
        group.label,
        summary.total,
        summary.pass44,
        summary.fail44,
        fmtPctPlain(summary.rate44),
        summary.denominator45,
        summary.pass45,
        summary.fail45,
        summary.cut45,
        summary.missing45,
        fmtPctPlain(summary.rate45),
        summary.passOverall,
        summary.follow,
        fmtPctPlain(summary.rateOverall),
      ];
    });
}

function xlsxColumnName(index) {
  let name = "";
  let value = index + 1;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function xlsxCellRef(rowIndex, colIndex) {
  return `${xlsxColumnName(colIndex)}${rowIndex + 1}`;
}

function xlsxRange(rowCount, colCount) {
  return `A1:${xlsxCellRef(Math.max(rowCount - 1, 0), Math.max(colCount - 1, 0))}`;
}

function xlsxCell(value, rowIndex, colIndex, styleId = 0) {
  const text = excelEscape(value);
  const style = styleId ? ` s="${styleId}"` : "";
  return `<c r="${xlsxCellRef(rowIndex, colIndex)}" t="inlineStr"${style}><is><t>${text}</t></is></c>`;
}

function xlsxTextWidth(value) {
  const text = String(value ?? "");
  if (!text) return 0;
  return [...text].reduce((total, char) => total + (char.charCodeAt(0) > 255 ? 1.7 : 1), 0);
}

function xlsxColumnWidth(sheet, colIndex) {
  const explicitWidth = Array.isArray(sheet.columnWidths) ? Number(sheet.columnWidths[colIndex]) : NaN;
  if (Number.isFinite(explicitWidth) && explicitWidth > 0) return explicitWidth;
  const samples = [sheet.headers[colIndex], ...sheet.rows.slice(0, 350).map((row) => row[colIndex])];
  const maxWidth = samples.reduce((max, value) => Math.max(max, xlsxTextWidth(value)), 0);
  return Math.max(9, Math.min(46, Math.ceil(maxWidth + 2)));
}

function xlsxSheetXml(sheet) {
  const noteRows = Array.isArray(sheet.noteRows) ? sheet.noteRows : [];
  const rows = [...noteRows, sheet.headers, ...sheet.rows];
  const headerRowIndex = noteRows.length;
  const colCount = Math.max(sheet.headers.length, ...noteRows.map((row) => row.length), ...sheet.rows.map((row) => row.length), 1);
  const sheetRows = rows.map((row, rowIndex) => {
    const isNoteRow = rowIndex < noteRows.length;
    const noteRowHeight = Number(sheet.noteRowHeight) || 92;
    const rowAttrs = isNoteRow ? ` r="${rowIndex + 1}" ht="${noteRowHeight}" customHeight="1"` : ` r="${rowIndex + 1}"`;
    const cellCount = isNoteRow ? row.length : colCount;
    const cells = Array.from({ length: cellCount }, (_, colIndex) => {
      const styleId = isNoteRow ? 2 : (rowIndex === headerRowIndex ? 1 : 0);
      return xlsxCell(row[colIndex] ?? "", rowIndex, colIndex, styleId);
    }).join("");
    return `<row${rowAttrs}>${cells}</row>`;
  }).join("");
  const cols = Array.from({ length: colCount }, (_, index) => {
    const width = xlsxColumnWidth(sheet, index);
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  }).join("");
  const range = xlsxRange(rows.length, colCount);
  const filterRange = `${xlsxCellRef(headerRowIndex, 0)}:${xlsxCellRef(Math.max(rows.length - 1, headerRowIndex), Math.max(colCount - 1, 0))}`;
  const freezeRows = headerRowIndex + 1;
  const topLeftCell = `A${freezeRows + 1}`;
  const sheetView = sheet.freezeHeader === false
    ? `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`
    : `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${freezeRows}" topLeftCell="${topLeftCell}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${range}"/>
  ${sheetView}
  <cols>${cols}</cols>
  <sheetData>${sheetRows}</sheetData>
  <autoFilter ref="${filterRange}"/>
</worksheet>`;
}

function xlsxContentTypes(sheets) {
  const sheetOverrides = sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`;
}

function xlsxRootRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function xlsxWorkbookRels(sheets) {
  const sheetRels = sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheetRels}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function xlsxWorkbookXml(sheets) {
  const sheetNodes = sheets.map((sheet, index) => `<sheet name="${excelEscape(excelSheetName(sheet.name))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetNodes}</sheets>
</workbook>`;
}

function xlsxStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><name val="Tahoma"/></font>
    <font><b/><sz val="11"/><color rgb="FF0F2E48"/><name val="Tahoma"/></font>
    <font><b/><sz val="9"/><color rgb="FFFFFFFF"/><name val="Tahoma"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEAF7F8"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD93025"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFCFE0EC"/></left><right style="thin"><color rgb="FFCFE0EC"/></right><top style="thin"><color rgb="FFCFE0EC"/></top><bottom style="thin"><color rgb="FFCFE0EC"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="49" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyNumberFormat="1"/>
    <xf numFmtId="49" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1"/>
    <xf numFmtId="49" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" applyNumberFormat="1"><alignment wrapText="1" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
}

function xlsxCoreXml() {
  const created = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>OTPC LPA Dashboard</dc:creator>
  <cp:lastModifiedBy>OTPC LPA Dashboard</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified>
</cp:coreProperties>`;
}

function xlsxAppXml(sheets) {
  const names = sheets.map((sheet) => `<vt:lpstr>${excelEscape(excelSheetName(sheet.name))}</vt:lpstr>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>LPA Tobacco Control Dashboard</Application>
  <HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant></vt:vector></HeadingPairs>
  <TitlesOfParts><vt:vector size="${sheets.length}" baseType="lpstr">${names}</vt:vector></TitlesOfParts>
</Properties>`;
}

function crc32(bytes) {
  let crc = -1;
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function zipDateParts(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function uint16(value) {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function uint32(value) {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

function bytesFromString(value) {
  return new TextEncoder().encode(String(value));
}

function bytesFromArray(values) {
  return new Uint8Array(values);
}

function buildZip(files) {
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;
  const { dosTime, dosDate } = zipDateParts();
  files.forEach((file) => {
    const nameBytes = bytesFromString(file.name);
    const dataBytes = file.bytes instanceof Uint8Array ? file.bytes : bytesFromString(file.content);
    const crc = crc32(dataBytes);
    const localHeader = bytesFromArray([
      ...uint32(0x04034b50),
      ...uint16(20),
      ...uint16(0x0800),
      ...uint16(0),
      ...uint16(dosTime),
      ...uint16(dosDate),
      ...uint32(crc),
      ...uint32(dataBytes.length),
      ...uint32(dataBytes.length),
      ...uint16(nameBytes.length),
      ...uint16(0),
    ]);
    chunks.push(localHeader, nameBytes, dataBytes);
    centralDirectory.push({ nameBytes, crc, size: dataBytes.length, offset });
    offset += localHeader.length + nameBytes.length + dataBytes.length;
  });
  const centralStart = offset;
  centralDirectory.forEach((entry) => {
    const header = bytesFromArray([
      ...uint32(0x02014b50),
      ...uint16(20),
      ...uint16(20),
      ...uint16(0x0800),
      ...uint16(0),
      ...uint16(dosTime),
      ...uint16(dosDate),
      ...uint32(entry.crc),
      ...uint32(entry.size),
      ...uint32(entry.size),
      ...uint16(entry.nameBytes.length),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint16(0),
      ...uint32(0),
      ...uint32(entry.offset),
    ]);
    chunks.push(header, entry.nameBytes);
    offset += header.length + entry.nameBytes.length;
  });
  const centralSize = offset - centralStart;
  const end = bytesFromArray([
    ...uint32(0x06054b50),
    ...uint16(0),
    ...uint16(0),
    ...uint16(files.length),
    ...uint16(files.length),
    ...uint32(centralSize),
    ...uint32(centralStart),
    ...uint16(0),
  ]);
  chunks.push(end);
  return new Blob(chunks, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function buildExcelWorkbook(sheets) {
  const files = [
    { name: "[Content_Types].xml", content: xlsxContentTypes(sheets) },
    { name: "_rels/.rels", content: xlsxRootRels() },
    { name: "docProps/core.xml", content: xlsxCoreXml() },
    { name: "docProps/app.xml", content: xlsxAppXml(sheets) },
    { name: "xl/workbook.xml", content: xlsxWorkbookXml(sheets) },
    { name: "xl/_rels/workbook.xml.rels", content: xlsxWorkbookRels(sheets) },
    { name: "xl/styles.xml", content: xlsxStylesXml() },
    ...sheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, content: xlsxSheetXml(sheet) })),
  ];
  return buildZip(files);
}

function exportValue(value) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function hasAnyExportItem(row) {
  return [...(row.lpaItems || []), ...(row.schoolItems || [])].some((item) => String(item || "").trim());
}

function exportItemValue(value) {
  const text = String(value ?? "").trim();
  if (!text) return "-";
  if (text === "1") return "ดำเนินการ";
  if (text === "0") return "ยังไม่พบการดำเนินงาน";
  return text;
}

function itemNeedsImprovement(value) {
  return String(value ?? "").trim() === "0";
}

function improvementSummary(items, sideLabel) {
  const values = items || [];
  const hasValues = values.some((item) => String(item || "").trim());
  if (!hasValues) return "ไม่มีข้อมูลรายข้อในฐานกลาง";
  const missingItems = values
    .map((item, index) => itemNeedsImprovement(item) ? `ข้อที่ ${index + 1}` : "")
    .filter(Boolean);
  if (!missingItems.length) return "ดำเนินการครบทุกข้อที่มีข้อมูล";
  return `${sideLabel}: ควรพัฒนา ${missingItems.join(", ")}`;
}

function detailedIndicatorHeaders() {
  return [
    "ปี",
    "เขตสุขภาพ",
    "จังหวัด",
    "อำเภอ",
    "ประเภท อปท.",
    "ชื่อ อปท.",
    "รหัส อปท.",
    "เลขตัวชี้วัดต้นฉบับด้าน อปท.",
    "จำนวนรายการที่ดำเนินการด้าน อปท.",
    "คะแนนรวมด้าน อปท.",
    "สถานะด้าน อปท.",
    "รายการด้าน อปท. ที่ควรพัฒนา",
    ...Array.from({ length: 8 }, (_, index) => `รายการย่อยด้าน อปท. ข้อที่ ${index + 1}`),
    "เลขตัวชี้วัดต้นฉบับด้านสถานศึกษา",
    "ระยะของข้อมูลด้านสถานศึกษา",
    "ใช้เปรียบเทียบด้านสถานศึกษาข้ามปี",
    "จำนวนรายการที่ดำเนินการด้านสถานศึกษา",
    "คะแนนรวมด้านสถานศึกษา",
    "สถานะด้านสถานศึกษา",
    "ตัดฐานด้านสถานศึกษา",
    "ไม่มีข้อมูลด้านสถานศึกษา",
    "รายการด้านสถานศึกษา ที่ควรพัฒนา",
    ...Array.from({ length: 7 }, (_, index) => `รายการย่อยด้านสถานศึกษา ข้อที่ ${index + 1}`),
    "หมายเหตุด้านสถานศึกษา",
    "สถานะรวม",
    "ข้อสังเกตคุณภาพข้อมูล",
  ];
}

function detailedIndicatorRows(detailRows) {
  return detailRows.map((record) => [
    record.year || state.year,
    record.region ? `เขตสุขภาพที่ ${record.region}` : "-",
    exportValue(record.province),
    exportValue(record.district),
    exportValue(record.type),
    exportValue(record.name),
    exportValue(record.orgCode),
    exportValue(record.lpaIndicator),
    exportValue(record.lpaActivityCount),
    exportValue(record.lpaScore),
    exportValue(record.lpaStatus),
    improvementSummary(record.lpaItems, "ด้าน อปท."),
    ...Array.from({ length: 8 }, (_, index) => exportItemValue(record.lpaItems?.[index])),
    exportValue(record.schoolIndicator),
    exportValue(record.schoolPhase),
    exportValue(record.schoolComparable),
    exportValue(record.schoolActivityCount),
    exportValue(record.schoolScore),
    exportValue(record.schoolStatus),
    exportValue(record.schoolCutbase),
    exportValue(record.schoolMissing),
    improvementSummary(record.schoolItems, "ด้านสถานศึกษา"),
    ...Array.from({ length: 7 }, (_, index) => exportItemValue(record.schoolItems?.[index])),
    exportValue(record.schoolNote),
    exportValue(record.overallStatus),
    exportValue(record.dataQuality),
  ]);
}

function expectsDetailedExport(year = state.year) {
  const numericYear = Number(year);
  return numericYear >= 2565 && numericYear <= 2567;
}

function exportDetailWarningRow(message) {
  return detailedIndicatorHeaders().map((_, index) => {
    if (index === 0) return state.year;
    if (index === 5) return message;
    return "-";
  });
}

function buildExportSheets(items, detailedItems = [], options = {}) {
  const detailItems = sortedDetailRows(items);
  const summary = summarize(items);
  let detailedRows = detailedIndicatorRows(detailedItems);
  if (!detailedRows.length && options.detailLoadWarning) {
    detailedRows = [exportDetailWarningRow(options.detailLoadWarning)];
  }
  const hasDetailedItems = detailedItems.some(hasAnyExportItem);
  const detailInfo = options.detailLoadWarning
    || (hasDetailedItems
      ? "มีข้อมูลรายข้อในไฟล์ Export"
      : "ไม่มีข้อมูลรายข้อในฐานกลางของปี/เงื่อนไขนี้ แสดงเฉพาะคะแนนรวมและสถานะ");
  const contextRows = [
    ["วันที่ Export", exportDateLabel()],
    ["ปีข้อมูล", state.year],
    ["ขอบเขตข้อมูล", exportScopeLabel()],
    ["เขตสุขภาพ", state.region ? `เขตสุขภาพที่ ${state.region}` : "ทุกเขตสุขภาพ"],
    ["จังหวัด", state.province || "ทุกจังหวัด"],
    ["อำเภอ", state.district || "ทุกอำเภอ"],
    ["ประเภท อปท.", state.type || "ทุกประเภท"],
    ["ตัวกรองเร็ว", quickFilterLabel()],
    ["ชื่อ อปท. ที่ค้นหา", state.search || "-"],
    ["จำนวนแถวที่ส่งออก", items.length],
    ["ร้อยละผ่านด้าน อปท.", fmtPctPlain(summary.rate44)],
    ["ร้อยละผ่านด้านสถานศึกษา", fmtPctPlain(summary.rate45)],
    ["ร้อยละผ่านภาพรวม", fmtPctPlain(summary.rateOverall)],
    ["ข้อมูลรายข้อ", detailInfo],
  ];
  const detailRows = detailItems.map((record) => [
    state.year,
    `เขตสุขภาพที่ ${record.region}`,
    record.province,
    record.district,
    record.type,
    record.name,
    record.s44 === "" ? "-" : record.s44,
    record.st44 || "-",
    record.schoolComparable === "ใช่" ? (record.s45 === "" ? "-" : record.s45) : "-",
    schoolStatusLabel(record),
    recordOverall(record),
  ]);
  const dictionaryRows = [
    ["ผ่าน", "ได้คะแนนตั้งแต่ 3 คะแนนขึ้นไป"],
    ["ไม่ผ่าน", "ได้คะแนนต่ำกว่า 3 คะแนน หรือไม่ดำเนินการตามเกณฑ์"],
    ["ตัดฐาน", "ใช้กับด้านสถานศึกษาเมื่อ อปท. ไม่มีสถานศึกษา/โรงเรียน หรือไม่ต้องประเมิน จึงไม่นำเข้า denominator"],
    ["ไม่มีข้อมูล", "ไม่มีค่าหรือข้อมูลไม่เพียงพอสำหรับสรุปผล"],
    ["ปี 2565-2566", "ข้อมูลด้านสถานศึกษาไม่ใช้เปรียบเทียบแนวโน้มข้ามปีตามข้อกำหนดของฐานข้อมูล"],
    ["รายการย่อยด้าน อปท. ข้อที่ 1-8", "ค่ารายข้อจากฐานข้อมูล clean ใช้ดูว่า อปท. ดำเนินการข้อใดแล้วหรือยังไม่ดำเนินการข้อใด"],
    ["รายการย่อยด้านสถานศึกษา ข้อที่ 1-7", "ค่ารายข้อจากฐานข้อมูล clean ใช้ดูรายละเอียดการดำเนินการด้านสถานศึกษาเมื่อปีนั้นมีข้อมูลเปรียบเทียบ"],
    ["คำว่า ดำเนินการ ในรายการย่อย", "หมายถึงฐานข้อมูลรายข้อระบุว่าพื้นที่มีการดำเนินงานในข้อนั้น"],
    ["คำว่า ยังไม่พบการดำเนินงาน ในรายการย่อย", "หมายถึงฐานข้อมูลรายข้อระบุว่ายังไม่พบการดำเนินงานในข้อนั้น จึงเป็นข้อที่สามารถใช้วางแผนพัฒนาคะแนนได้"],
    ["รายการที่ควรพัฒนา", "สรุปจากรายการย่อยที่ยังไม่พบการดำเนินงาน เพื่อให้ผู้ใช้เห็นทันทีว่าควรกลับไปดูหรือพัฒนาข้อใด"],
    ["ช่องว่างหรือเครื่องหมาย - ในรายการย่อย", "หมายถึงฐานกลางของปีนั้นยังไม่มีข้อมูลรายข้อในระดับที่ใช้ Export ได้ ไม่ได้แปลว่าไม่ดำเนินการเสมอไป"],
    ["หมายเหตุ", "ไฟล์นี้เป็น V4.3.1 ส่งออกจากข้อมูลตามตัวกรองที่ผู้ใช้เลือกใน Dashboard"],
  ];
  return [
    {
      name: "สรุปเงื่อนไข",
      headers: ["รายการ", "ค่า"],
      rows: contextRows,
    },
    {
      name: "สรุปพื้นที่",
      headers: ["ระดับ", "พื้นที่", "จำนวน อปท.", "ผ่านด้าน อปท.", "ไม่ผ่านด้าน อปท.", "ร้อยละผ่านด้าน อปท.", "ฐานสถานศึกษา", "ผ่านสถานศึกษา", "ไม่ผ่านสถานศึกษา", "ตัดฐาน", "ไม่มีข้อมูล", "ร้อยละผ่านสถานศึกษา", "ผ่านภาพรวม", "ควรติดตาม", "ร้อยละผ่านภาพรวม"],
      rows: summaryExportRows(items),
    },
    {
      name: "รายละเอียด อปท.",
      headers: ["ปี", "เขตสุขภาพ", "จังหวัด", "อำเภอ", "ประเภท อปท.", "ชื่อ อปท.", "คะแนนด้าน อปท.", "สถานะด้าน อปท.", "คะแนนด้านสถานศึกษา", "สถานะด้านสถานศึกษา", "สถานะรวม"],
      rows: detailRows,
    },
    {
      name: "รายละเอียดตัวชี้วัดย่อย",
      columnWidths: [14, 42, 30],
      noteRowHeight: 106,
      freezeHeader: false,
      noteRows: [[
        "หมายเหตุสำคัญ: คลิกอ่านแถวนี้ก่อนใช้ข้อมูลรายข้อ",
        "คอลัมน์รายการย่อยด้าน อปท. และด้านสถานศึกษาแสดงเป็น “ข้อที่ 1, ข้อที่ 2...” ตามแบบประเมิน LPA ของปีข้อมูลนั้น ๆ จึงควรเปิดเอกสารรายละเอียดตัวชี้วัดประกอบการแปลผล",
        `ลิงก์รายละเอียดชื่อรายการประเมิน/ตัวชี้วัดและเกณฑ์เพิ่มเติม: ${INDICATOR_DETAIL_DRIVE_URL}`,
      ]],
      headers: detailedIndicatorHeaders(),
      rows: detailedRows,
    },
    {
      name: "คำอธิบายข้อมูล",
      headers: ["คำ", "ความหมาย"],
      rows: dictionaryRows,
    },
  ];
}

function downloadExcelWorkbook(items, detailedItems = [], options = {}) {
  const sheets = buildExportSheets(items, detailedItems, options);
  const blob = buildExcelWorkbook(sheets);
  const scope = exportFileSafe(exportScopeLabel()) || `ปี_${state.year}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `LPA_Export_${scope}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function handleExportExcel() {
  const items = filterRecords();
  if (!items.length) {
    window.alert("ไม่มีข้อมูลในเงื่อนไขที่เลือก จึงไม่สามารถ Export ได้");
    return;
  }
  const originalText = els.exportExcel ? els.exportExcel.innerHTML : "";
  if (els.exportExcel) {
    els.exportExcel.disabled = true;
    els.exportExcel.innerHTML = `<span aria-hidden="true">…</span> กำลัง Export`;
  }
  setLoading(true, "กำลังโหลดข้อมูลรายละเอียดเพื่อสร้างไฟล์ Excel");
  let detailedItems = [];
  let detailLoadWarning = "";
  try {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    try {
      const detailRows = await loadExportDetailRows(state.year);
      detailedItems = matchExportDetailRows(items, detailRows);
      if (expectsDetailedExport(state.year) && !detailRows.length) {
        detailLoadWarning = "ไม่สามารถโหลดข้อมูลรายข้อของปีนี้ได้ในการ Export ครั้งนี้";
      } else if (expectsDetailedExport(state.year) && detailRows.length && !detailedItems.length) {
        detailLoadWarning = "พบไฟล์ข้อมูลรายข้อ แต่ไม่สามารถจับคู่กับข้อมูลตามตัวกรองปัจจุบันได้";
      }
    } catch (error) {
      console.warn("Cannot load detailed export rows.", error);
      if (expectsDetailedExport(state.year)) {
        detailLoadWarning = "ไม่สามารถโหลดข้อมูลรายข้อของปีนี้ได้ในการ Export ครั้งนี้";
      }
    }
    setLoading(true, "กำลังสร้างไฟล์ Excel ตามตัวกรองปัจจุบัน");
    await new Promise((resolve) => requestAnimationFrame(resolve));
    downloadExcelWorkbook(items, detailedItems, { detailLoadWarning });
  } finally {
    setLoading(false);
    if (els.exportExcel) {
      els.exportExcel.disabled = false;
      els.exportExcel.innerHTML = originalText;
    }
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[char]));
}

function exportPreviewScopeTitle() {
  if (state.district && state.province) return `${state.district} · ${state.province}`;
  if (state.province) return state.province;
  if (state.region) return `เขตสุขภาพที่ ${state.region}`;
  return "ประเทศไทย";
}

function exportPreviewScopeType() {
  if (state.province || state.region) return "area";
  return "country";
}

function exportPreviewConditionText() {
  const parts = [
    state.region ? `เขตสุขภาพที่ ${state.region}` : "ทุกเขตสุขภาพ",
    state.province || "ทุกจังหวัด",
    state.district || "ทุกอำเภอ",
    state.type || "ทุกประเภท อปท.",
    quickFilterLabel(state.quick),
  ];
  if (state.search) parts.push(`ค้นหา: ${state.search}`);
  return `ผลการดำเนินงานปี ${state.year} ของ${exportPreviewScopeTitle()} ตามเงื่อนไข ${parts.filter(Boolean).join(" · ")}`;
}

function cloneRenderedSvgHtml(element, className = "") {
  const svg = element
    ? (String(element.tagName || "").toLowerCase() === "svg" ? element : element.querySelector("svg"))
    : null;
  if (!svg) return `<div class="export-slide-empty">ไม่มีข้อมูล</div>`;
  const clone = svg.cloneNode(true);
  clone.removeAttribute("id");
  clone.classList.add("export-cloned-svg");
  if (className) clone.classList.add(className);
  clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  return clone.outerHTML;
}

function exportKpiCardsHtml(summary) {
  const kpis = [
    {
      tone: "teal",
      label: "อปท. ทั้งหมด",
      value: fmtInt(summary.total),
      detail: exportPreviewScopeTitle(),
    },
    {
      tone: "blue",
      label: "ด้าน อปท. ควบคุมผลิตภัณฑ์ยาสูบ",
      value: fmtPctPlain(summary.rate44),
      detail: `${fmtInt(summary.pass44)} ผ่าน · ${fmtInt(summary.fail44)} ไม่ผ่าน`,
    },
    {
      tone: "yellow",
      label: "ด้านสถานศึกษา (อปท.) ควบคุมผลิตภัณฑ์ยาสูบ",
      value: Number.isFinite(summary.rate45) ? fmtPctPlain(summary.rate45) : "ไม่มีข้อมูล",
      detail: Number.isFinite(summary.rate45)
        ? `${fmtInt(summary.pass45)} ผ่าน · ${fmtInt(summary.fail45)} ไม่ผ่าน · ตัดฐาน ${fmtInt(summary.cut45)}`
        : "ปีนี้ไม่มีข้อมูลเปรียบเทียบด้านสถานศึกษา",
    },
    {
      tone: "red",
      label: "อปท. ที่ควรติดตาม",
      value: fmtInt(summary.follow),
      detail: `ผ่านภาพรวม ${fmtInt(summary.passOverall)} แห่ง`,
    },
  ];
  return kpis.map((kpi) => `
    <article class="export-slide-kpi export-kpi-${kpi.tone}">
      <span>${escapeHtml(kpi.label)}</span>
      <strong>${escapeHtml(kpi.value)}</strong>
      <small>${escapeHtml(kpi.detail)}</small>
    </article>
  `).join("");
}

function exportDetailMetric(rows) {
  const summary = summarize(rows);
  if (state.quick === "lpa") {
    const value = summary.total ? summary.fail44 / summary.total : NaN;
    return { value, label: `${fmtInt(summary.fail44)} ต้องติดตามด้าน อปท.` };
  }
  if (state.quick === "school") {
    const base = schoolFollowBase(summary);
    const follow = summary.fail45 + summary.missing45;
    const value = base ? follow / base : NaN;
    return { value, label: `${fmtInt(follow)} ต้องติดตามด้านสถานศึกษา` };
  }
  if (state.quick === "follow") {
    const value = summary.total ? summary.follow / summary.total : NaN;
    return { value, label: `${fmtInt(summary.follow)} ควรติดตาม` };
  }
  return { value: summary.rateOverall, label: `${fmtInt(summary.passOverall)} ผ่านภาพรวม` };
}

function exportAreaDetailHtml(items) {
  const groupKey = state.province ? "district" : "province";
  const title = state.province ? "ผลรายอำเภอ" : "ผลรายจังหวัด";
  const grouped = groupBy(items, groupKey)
    .filter(([label]) => label && label !== "ไม่ระบุ")
    .map(([label, rows]) => {
      const metric = exportDetailMetric(rows);
      return { label, rows, ...metric };
    })
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 7);

  if (!grouped.length) {
    return `
      <section class="export-slide-card export-slide-detail">
        <h3>${title}</h3>
        <div class="export-slide-empty">ไม่มีข้อมูลในเงื่อนไขนี้</div>
      </section>
    `;
  }

  const rowsHtml = grouped.map((row, index) => {
    const percent = Number.isFinite(row.value) ? fmtRateNumber(row.value) : "-";
    return `
      <div class="export-detail-row">
        <span class="export-detail-rank">${index + 1}</span>
        <div>
          <strong>${escapeHtml(row.label)}</strong>
          <small>${fmtInt(row.rows.length)} อปท. · ${escapeHtml(row.label)}</small>
        </div>
        <div class="export-detail-bar" aria-hidden="true"><i style="width:${Number.isFinite(row.value) ? Math.max(4, row.value * 100) : 0}%"></i></div>
        <span>${percent}</span>
      </div>
    `;
  }).join("");

  return `
    <section class="export-slide-card export-slide-detail">
      <div class="export-slide-card-heading">
        <h3>${title}</h3>
        <span>${escapeHtml(exportPreviewScopeTitle())}</span>
      </div>
      <div class="export-detail-list">${rowsHtml}</div>
    </section>
  `;
}

function exportBarChartHtml(items, chartRegion = "") {
  const provinceMode = Boolean(chartRegion);
  const groupKey = provinceMode ? "province" : "region";
  const grouped = groupBy(items, groupKey)
    .filter(([label]) => label && label !== "ไม่ระบุ")
    .sort((a, b) => provinceMode
      ? String(a[0]).localeCompare(String(b[0]), "th")
      : Number(a[0]) - Number(b[0]));

  if (!grouped.length) return `<div class="export-slide-empty">ไม่มีข้อมูล</div>`;

  const series = activeMetricSeries();
  const width = 980;
  const height = provinceMode ? 360 : 250;
  const margin = { top: provinceMode ? 30 : 22, right: 16, bottom: provinceMode ? 48 : 30, left: 38 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const groupW = plotW / grouped.length;
  const barGap = series.length > 1 ? 6 : 0;
  const barW = Math.max(16, Math.min(34, (groupW - 16 - barGap * Math.max(0, series.length - 1)) / Math.max(1, series.length)));
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const y = (rate) => margin.top + plotH - Math.max(0, Math.min(1, rate || 0)) * plotH;
  const labelText = (label) => {
    const text = String(label);
    if (!provinceMode) return text;
    return text.length > 7 ? `${text.slice(0, 6)}…` : text;
  };
  const colorClass = (key) => key === "45" ? "export-bar-school" : (key === "watch" ? "export-bar-watch" : "export-bar-lpa");

  const grid = ticks.map((tick) => {
    const yy = y(tick);
    return `
      <line class="export-chart-grid" x1="${margin.left}" y1="${yy}" x2="${width - margin.right}" y2="${yy}"></line>
      <text class="export-chart-axis" x="${margin.left - 8}" y="${yy + 4}" text-anchor="end">${Math.round(tick * 100)}</text>
    `;
  }).join("");

  const bars = grouped.map(([label, rows], index) => {
    const selected = provinceMode && state.province && String(label) === String(state.province);
    const xCenter = margin.left + index * groupW + groupW / 2;
    const totalBarW = series.length * barW + Math.max(0, series.length - 1) * barGap;
    const highlight = selected
      ? `<rect class="export-chart-highlight" x="${xCenter - Math.min(groupW * 0.42, 42)}" y="${margin.top - 12}" width="${Math.min(groupW * 0.84, 84)}" height="${plotH + 18}" rx="8"></rect>`
      : "";
    const labelY = height - 12;
    return `
      ${highlight}
      ${series.map((item, seriesIndex) => {
        const rate = metricRate(rows, item.key);
        if (!Number.isFinite(rate)) return "";
        const xPos = xCenter - totalBarW / 2 + seriesIndex * (barW + barGap);
        const yPos = y(rate);
        const h = Math.max(1, margin.top + plotH - yPos);
        return `
          <rect class="${colorClass(item.key)}" x="${xPos}" y="${yPos}" width="${barW}" height="${h}" rx="4"></rect>
          <text class="export-chart-value" x="${xPos + barW / 2}" y="${Math.max(12, yPos - 5)}" text-anchor="middle">${fmtRateNumber(rate)}</text>
        `;
      }).join("")}
      <text class="export-chart-axis export-chart-category" x="${xCenter}" y="${labelY}" text-anchor="middle">${escapeHtml(labelText(label))}</text>
    `;
  }).join("");

  return `
    <svg class="export-compact-bar-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${provinceMode ? "กราฟแท่งรายจังหวัดสำหรับภาพสรุป" : "กราฟแท่งรายเขตสุขภาพสำหรับภาพสรุป"}">
      ${grid}
      <line class="export-chart-axis-line" x1="${margin.left}" y1="${margin.top + plotH}" x2="${width - margin.right}" y2="${margin.top + plotH}"></line>
      <line class="export-chart-axis-line" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotH}"></line>
      ${bars}
      <text class="export-chart-axis export-chart-y-title" x="13" y="${margin.top + plotH / 2}" text-anchor="middle" transform="rotate(-90 13 ${margin.top + plotH / 2})">ร้อยละ</text>
    </svg>
  `;
}

function exportTrendChartHtml(items) {
  const cachedYears = availableYears.filter((year) => recordsByYear.has(Number(year))).sort((a, b) => Number(a) - Number(b));
  const hasActiveFilter = Boolean(state.region || state.province || state.district || state.type || state.search || state.quick !== "all");
  const useCountrySummary = !hasActiveFilter && countrySummaries.length;
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

  if (!summaries.length) return `<div class="export-slide-empty">ไม่มีข้อมูล</div>`;

  const series = activeMetricSeries();
  const width = 980;
  const areaMode = exportPreviewScopeType() === "area";
  const height = areaMode ? 350 : 250;
  const margin = { top: areaMode ? 34 : 26, right: 34, bottom: areaMode ? 42 : 32, left: 38 };
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
  const colorClass = (key) => key === "45" ? "export-trend-school" : (key === "watch" ? "export-trend-watch" : "export-trend-lpa");

  const valueLabel = (point, item, pointIndex, points) => {
    const xShift = pointIndex === 0 ? 15 : pointIndex === points.length - 1 ? -15 : 0;
    const yShift = item.key === "45" ? 22 : -12;
    return `<text class="export-chart-value export-trend-value" x="${point.x + xShift}" y="${point.y + yShift}" text-anchor="middle">${fmtRateNumber(point.rate)}</text>`;
  };

  return `
    <svg class="export-compact-trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="กราฟเส้นเทียบรายปีสำหรับภาพสรุป">
      ${ticks.map((tick) => {
        const yy = y(tick);
        return `
          <line class="export-chart-grid" x1="${margin.left}" y1="${yy}" x2="${width - margin.right}" y2="${yy}"></line>
          <text class="export-chart-axis" x="${margin.left - 8}" y="${yy + 4}" text-anchor="end">${Math.round(tick * 100)}</text>
        `;
      }).join("")}
      <line class="export-chart-axis-line" x1="${margin.left}" y1="${margin.top + plotH}" x2="${width - margin.right}" y2="${margin.top + plotH}"></line>
      <line class="export-chart-axis-line" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotH}"></line>
      ${pilotX !== null ? `<line class="export-trend-marker" x1="${pilotX}" y1="${margin.top}" x2="${pilotX}" y2="${margin.top + plotH}"></line><text class="export-trend-marker-label" x="${pilotX + 10}" y="${margin.top + 16}">เริ่มข้อมูลสถานศึกษา</text>` : ""}
      ${allPoints.map((item) => item.points.length > 1
        ? `<path class="export-trend-line ${colorClass(item.key)}" d="${path(item.points)}"></path>`
        : "").join("")}
      ${allPoints.map((item) => item.points.map((point, index) => `
        <circle class="export-trend-dot ${colorClass(item.key)}" cx="${point.x}" cy="${point.y}" r="5"></circle>
        ${valueLabel(point, item, index, item.points)}
      `).join("")).join("")}
      ${years.map((year, index) => `<text class="export-chart-axis export-chart-category" x="${x(index)}" y="${height - 12}" text-anchor="middle">${year}</text>`).join("")}
      <text class="export-chart-axis export-chart-y-title" x="13" y="${margin.top + plotH / 2}" text-anchor="middle" transform="rotate(-90 13 ${margin.top + plotH / 2})">ร้อยละ</text>
    </svg>
  `;
}

function exportCanvasFont(size, weight = 700) {
  return `${weight} ${size}px "IBM Plex Sans Thai", Tahoma, Arial, sans-serif`;
}

function exportCanvasColor(tone) {
  return {
    teal: "#00a6a6",
    blue: "#257dd7",
    yellow: "#f5b82e",
    red: "#d94d45",
    green: "#25a97b",
    text: "#102b40",
    muted: "#5f7688",
    border: "#d6e8ef",
    soft: "#eef8fb",
    grid: "#d9e9ef",
  }[tone] || tone;
}

function drawRoundedRect(ctx, x, y, width, height, radius = 10) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCanvasCard(ctx, x, y, width, height, options = {}) {
  const { accent = "", fill = "#ffffff", radius = 10 } = options;
  drawRoundedRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = exportCanvasColor("border");
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (accent) {
    ctx.save();
    drawRoundedRect(ctx, x, y, width, height, radius);
    ctx.clip();
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, 7, height);
    ctx.restore();
  }
}

function wrapCanvasText(ctx, text, maxWidth) {
  const raw = String(text ?? "");
  if (!raw) return [""];
  const paragraphs = raw.split(/\n/);
  const lines = [];
  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(/(\s+)/).filter(Boolean);
    let line = "";
    words.forEach((word) => {
      const test = line ? line + word : word;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
        return;
      }
      if (line) {
        lines.push(line.trimEnd());
        line = "";
      }
      if (ctx.measureText(word).width <= maxWidth) {
        line = word.trimStart();
        return;
      }
      let chunk = "";
      Array.from(word).forEach((char) => {
        const testChunk = chunk + char;
        if (ctx.measureText(testChunk).width > maxWidth && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk = testChunk;
        }
      });
      line = chunk;
    });
    if (line) lines.push(line.trimEnd());
  });
  return lines.length ? lines : [""];
}

function drawCanvasText(ctx, text, x, y, options = {}) {
  const {
    size = 20,
    weight = 700,
    color = exportCanvasColor("text"),
    maxWidth = Infinity,
    lineHeight = Math.round(size * 1.28),
    maxLines = 1,
    align = "left",
    baseline = "top",
  } = options;
  ctx.save();
  ctx.font = exportCanvasFont(size, weight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  const lines = Number.isFinite(maxWidth) ? wrapCanvasText(ctx, text, maxWidth) : [String(text ?? "")];
  const clipped = lines.slice(0, maxLines);
  clipped.forEach((line, index) => {
    let output = line;
    if (index === maxLines - 1 && lines.length > maxLines) {
      while (ctx.measureText(`${output}...`).width > maxWidth && output.length > 0) {
        output = Array.from(output).slice(0, -1).join("");
      }
      output = `${output}...`;
    }
    ctx.fillText(output, x, y + index * lineHeight);
  });
  ctx.restore();
  return clipped.length * lineHeight;
}

function drawCanvasFitText(ctx, text, x, y, maxWidth, options = {}) {
  const minSize = options.minSize || 16;
  const maxLines = options.maxLines || 1;
  for (let size = options.size || 24; size >= minSize; size -= 1) {
    ctx.font = exportCanvasFont(size, options.weight || 700);
    if (wrapCanvasText(ctx, text, maxWidth).length <= maxLines) {
      return drawCanvasText(ctx, text, x, y, { ...options, size, maxWidth, maxLines });
    }
  }
  return drawCanvasText(ctx, text, x, y, { ...options, size: minSize, maxWidth, maxLines });
}

function truncateCanvasText(ctx, text, maxWidth) {
  let output = String(text ?? "");
  if (ctx.measureText(output).width <= maxWidth) return output;
  while (ctx.measureText(`${output}...`).width > maxWidth && output.length > 0) {
    output = Array.from(output).slice(0, -1).join("");
  }
  return `${output}...`;
}

function drawImageContain(ctx, image, x, y, width, height) {
  const ratio = Math.min(width / image.width, height / image.height);
  const drawW = image.width * ratio;
  const drawH = image.height * ratio;
  ctx.drawImage(image, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
}

function drawExportPill(ctx, text, x, y, options = {}) {
  ctx.save();
  ctx.font = exportCanvasFont(options.size || 18, 700);
  const padX = options.padX || 18;
  const width = Math.min(options.maxWidth || 150, ctx.measureText(text).width + padX * 2);
  const height = options.height || 42;
  drawRoundedRect(ctx, x - width, y, width, height, height / 2);
  ctx.fillStyle = options.fill || "#dff7f4";
  ctx.fill();
  ctx.fillStyle = options.color || "#008b87";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(truncateCanvasText(ctx, text, width - padX), x - width / 2, y + height / 2);
  ctx.restore();
}

function exportKpiCanvasData(summary) {
  return [
    {
      tone: "teal",
      label: "อปท. ทั้งหมด",
      value: fmtInt(summary.total),
      detail: exportPreviewScopeTitle(),
    },
    {
      tone: "blue",
      label: "ด้าน อปท. ควบคุมผลิตภัณฑ์ยาสูบ",
      value: fmtPctPlain(summary.rate44),
      detail: `${fmtInt(summary.pass44)} ผ่าน · ${fmtInt(summary.fail44)} ไม่ผ่าน`,
    },
    {
      tone: "yellow",
      label: "ด้านสถานศึกษา (อปท.) ควบคุมผลิตภัณฑ์ยาสูบ",
      value: Number.isFinite(summary.rate45) ? fmtPctPlain(summary.rate45) : "ไม่มีข้อมูล",
      detail: Number.isFinite(summary.rate45)
        ? `${fmtInt(summary.pass45)} ผ่าน · ${fmtInt(summary.fail45)} ไม่ผ่าน · ตัดฐาน ${fmtInt(summary.cut45)}`
        : "ปีนี้ไม่มีข้อมูลเปรียบเทียบด้านสถานศึกษา",
    },
    {
      tone: "red",
      label: "อปท. ที่ควรติดตาม",
      value: fmtInt(summary.follow),
      detail: `ผ่านภาพรวม ${fmtInt(summary.passOverall)} แห่ง`,
    },
  ];
}

function drawExportHeader(ctx, x, y, width) {
  const conditionW = 455;
  drawCanvasFitText(
    ctx,
    "การดำเนินงานควบคุมผลิตภัณฑ์ยาสูบขององค์กรปกครองส่วนท้องถิ่น",
    x,
    y,
    width - conditionW - 52,
    { size: 43, minSize: 34, weight: 800, maxLines: 1, color: "#000000" },
  );
  drawCanvasFitText(
    ctx,
    "จากข้อมูลผลการประเมินประสิทธิภาพองค์กรปกครองส่วนท้องถิ่น (LPA)",
    x,
    y + 58,
    width - conditionW - 52,
    { size: 25, minSize: 20, weight: 800, maxLines: 1, color: "#000000" },
  );

  const conditionX = x + width - conditionW;
  drawCanvasCard(ctx, conditionX, y - 8, conditionW, 116, { accent: exportCanvasColor("teal"), fill: "#f8fcfd", radius: 12 });
  drawCanvasText(ctx, exportPreviewConditionText(), conditionX + 28, y + 14, {
    size: 20,
    weight: 700,
    color: exportCanvasColor("muted"),
    maxWidth: conditionW - 52,
    maxLines: 4,
    lineHeight: 27,
  });
}

function drawExportKpis(ctx, summary, x, y, width) {
  const gap = 18;
  const cardW = (width - gap * 3) / 4;
  exportKpiCanvasData(summary).forEach((kpi, index) => {
    const cardX = x + index * (cardW + gap);
    drawCanvasCard(ctx, cardX, y, cardW, 132, { accent: exportCanvasColor(kpi.tone), radius: 10 });
    drawCanvasFitText(ctx, kpi.label, cardX + 28, y + 22, cardW - 56, {
      size: 21,
      minSize: 16,
      weight: 800,
      color: exportCanvasColor("muted"),
      maxLines: 1,
    });
    drawCanvasFitText(ctx, kpi.value, cardX + 28, y + 56, cardW - 56, {
      size: 50,
      minSize: 34,
      weight: 800,
      color: exportCanvasColor("text"),
      maxLines: 1,
    });
    drawCanvasText(ctx, kpi.detail, cardX + 28, y + 104, {
      size: 19,
      weight: 700,
      color: exportCanvasColor("muted"),
      maxWidth: cardW - 56,
      maxLines: 1,
    });
  });
}

function drawExportChartFrame(ctx, x, y, width, height, title) {
  drawCanvasCard(ctx, x, y, width, height, { radius: 10 });
  drawCanvasFitText(ctx, title, x + 22, y + 20, width - 44, {
    size: 27,
    minSize: 20,
    weight: 800,
    maxLines: 1,
  });
}

function drawExportMapCard(ctx, x, y, width, height, mapImage) {
  drawExportChartFrame(ctx, x, y, width, height, "ภาพแผนที่ประเทศไทย");
  const pillText = els.mapPill ? els.mapPill.textContent.trim() : "";
  if (pillText) drawExportPill(ctx, pillText, x + width - 22, y + 18, { maxWidth: 140 });
  if (mapImage) drawImageContain(ctx, mapImage, x + 20, y + 68, width - 40, height - 112);
  drawCanvasText(ctx, currentMapMetric().label, x + width / 2, y + height - 34, {
    size: 19,
    weight: 700,
    color: exportCanvasColor("muted"),
    align: "center",
  });
}

function exportTrendSummaries(items) {
  const series = activeMetricSeries();
  const cachedYears = availableYears.filter((year) => recordsByYear.has(Number(year))).sort((a, b) => Number(a) - Number(b));
  const hasActiveFilter = Boolean(state.region || state.province || state.district || state.type || state.search || state.quick !== "all");
  const canUseCountrySummary = !hasActiveFilter && countrySummaries.length && !series.some((item) => item.key === "watch");
  if (canUseCountrySummary) {
    return [...countrySummaries].sort((a, b) => Number(a.year) - Number(b.year)).map((row) => ({
      year: Number(row.year),
      rates: {
        "44": toRate(row.lpa_side_pass_rate),
        "45": isComparableValue(row.school_side_comparable) ? toRate(row.school_side_pass_rate) : NaN,
      },
    }));
  }
  if (cachedYears.length) {
    return cachedYears.map((year) => ({ year: Number(year), rows: filterRecords("quick", recordsByYear.get(Number(year))) }));
  }
  return [{ year: Number(state.year), rows: items }];
}

function drawExportLineChart(ctx, items, x, y, width, height) {
  drawExportChartFrame(ctx, x, y, width, height, "กราฟเส้นเทียบรายปี");
  const summaries = exportTrendSummaries(items);
  if (!summaries.length) {
    drawCanvasText(ctx, "ไม่มีข้อมูล", x + width / 2, y + height / 2, { size: 22, align: "center", color: exportCanvasColor("muted") });
    return;
  }
  const series = activeMetricSeries();
  const margin = { top: 72, right: 38, bottom: 50, left: 58 };
  const plotX = x + margin.left;
  const plotY = y + margin.top;
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const yScale = (rate) => plotY + plotH - Math.max(0, Math.min(1, rate || 0)) * plotH;
  const xScale = (index) => plotX + (summaries.length === 1 ? plotW / 2 : index * (plotW / (summaries.length - 1)));
  ctx.save();
  ctx.strokeStyle = exportCanvasColor("grid");
  ctx.lineWidth = 1.5;
  [0, 0.25, 0.5, 0.75, 1].forEach((tick) => {
    const yy = yScale(tick);
    ctx.beginPath();
    ctx.moveTo(plotX, yy);
    ctx.lineTo(plotX + plotW, yy);
    ctx.stroke();
    drawCanvasText(ctx, String(Math.round(tick * 100)), plotX - 14, yy - 10, { size: 17, weight: 800, color: exportCanvasColor("muted"), align: "right" });
  });
  ctx.strokeStyle = "#c8dde6";
  ctx.beginPath();
  ctx.moveTo(plotX, plotY);
  ctx.lineTo(plotX, plotY + plotH);
  ctx.lineTo(plotX + plotW, plotY + plotH);
  ctx.stroke();
  drawCanvasText(ctx, "ร้อยละ", plotX - 46, plotY + plotH / 2, { size: 17, weight: 800, color: exportCanvasColor("muted"), align: "center" });

  const pilotIndex = summaries.findIndex((row) => Number(row.year) === 2567);
  if (pilotIndex >= 0) {
    const px = xScale(pilotIndex);
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = "#b8d2df";
    ctx.beginPath();
    ctx.moveTo(px, plotY);
    ctx.lineTo(px, plotY + plotH);
    ctx.stroke();
    ctx.setLineDash([]);
    drawCanvasText(ctx, "เริ่มข้อมูลสถานศึกษา", px + 14, plotY + 30, { size: 14, weight: 700, color: exportCanvasColor("muted"), maxWidth: 180, maxLines: 1 });
  }

  series.forEach((item) => {
    const points = summaries.map((row, index) => {
      const rate = row.rates ? row.rates[item.key] : metricRate(row.rows, item.key);
      return { x: xScale(index), y: yScale(rate), rate, year: row.year };
    }).filter((point) => Number.isFinite(point.rate));
    if (!points.length) return;
    const color = item.key === "45" ? exportCanvasColor("yellow") : item.key === "watch" ? exportCanvasColor("red") : exportCanvasColor("blue");
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index) ctx.lineTo(point.x, point.y);
      else ctx.moveTo(point.x, point.y);
    });
    ctx.stroke();
    points.forEach((point, index) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
      ctx.fill();
      const last = index === points.length - 1;
      const first = index === 0;
      const yOffset = item.key === "45" ? 20 : -28;
      const xOffset = first ? 16 : last ? -16 : 0;
      drawCanvasText(ctx, fmtRateNumber(point.rate), point.x + xOffset, point.y + yOffset, {
        size: 17,
        weight: 800,
        color: exportCanvasColor("text"),
        align: "center",
      });
    });
  });
  summaries.forEach((row, index) => {
    drawCanvasText(ctx, String(row.year), xScale(index), plotY + plotH + 24, {
      size: 17,
      weight: 800,
      color: exportCanvasColor("muted"),
      align: "center",
    });
  });
  ctx.restore();
}

function exportBarGroups(items, chartRegion = "") {
  const provinceMode = Boolean(chartRegion);
  const groupKey = provinceMode ? "province" : "region";
  return groupBy(items, groupKey)
    .filter(([label]) => label && label !== "ไม่ระบุ")
    .sort((a, b) => provinceMode
      ? String(a[0]).localeCompare(String(b[0]), "th")
      : Number(a[0]) - Number(b[0]));
}

function drawExportBarChart(ctx, items, chartRegion, x, y, width, height) {
  const title = chartRegion ? "กราฟแท่งรายจังหวัด" : "กราฟแท่งรายเขตสุขภาพ";
  drawExportChartFrame(ctx, x, y, width, height, title);
  const grouped = exportBarGroups(items, chartRegion);
  if (!grouped.length) {
    drawCanvasText(ctx, "ไม่มีข้อมูล", x + width / 2, y + height / 2, { size: 22, align: "center", color: exportCanvasColor("muted") });
    return;
  }
  const series = activeMetricSeries();
  const margin = { top: 72, right: 32, bottom: 58, left: 58 };
  const plotX = x + margin.left;
  const plotY = y + margin.top;
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const groupW = plotW / grouped.length;
  const barGap = series.length > 1 ? 8 : 0;
  const barW = Math.max(14, Math.min(42, (groupW - 18 - barGap * Math.max(0, series.length - 1)) / Math.max(1, series.length)));
  const yScale = (rate) => plotY + plotH - Math.max(0, Math.min(1, rate || 0)) * plotH;
  ctx.save();
  ctx.strokeStyle = exportCanvasColor("grid");
  ctx.lineWidth = 1.5;
  [0, 0.25, 0.5, 0.75, 1].forEach((tick) => {
    const yy = yScale(tick);
    ctx.beginPath();
    ctx.moveTo(plotX, yy);
    ctx.lineTo(plotX + plotW, yy);
    ctx.stroke();
    drawCanvasText(ctx, String(Math.round(tick * 100)), plotX - 14, yy - 10, { size: 17, weight: 800, color: exportCanvasColor("muted"), align: "right" });
  });
  ctx.strokeStyle = "#c8dde6";
  ctx.beginPath();
  ctx.moveTo(plotX, plotY);
  ctx.lineTo(plotX, plotY + plotH);
  ctx.lineTo(plotX + plotW, plotY + plotH);
  ctx.stroke();
  drawCanvasText(ctx, "ร้อยละ", plotX - 46, plotY + plotH / 2, { size: 17, weight: 800, color: exportCanvasColor("muted"), align: "center" });

  grouped.forEach(([label, rows], index) => {
    const xCenter = plotX + index * groupW + groupW / 2;
    const totalBarW = series.length * barW + Math.max(0, series.length - 1) * barGap;
    const selected = chartRegion && state.province && String(label) === String(state.province);
    if (selected) {
      ctx.fillStyle = "#eaf9f7";
      drawRoundedRect(ctx, xCenter - Math.min(groupW * 0.42, 58), plotY - 14, Math.min(groupW * 0.84, 116), plotH + 20, 8);
      ctx.fill();
    }
    series.forEach((item, seriesIndex) => {
      const rate = metricRate(rows, item.key);
      if (!Number.isFinite(rate)) return;
      const color = item.key === "45" ? exportCanvasColor("yellow") : item.key === "watch" ? exportCanvasColor("red") : exportCanvasColor("blue");
      const barX = xCenter - totalBarW / 2 + seriesIndex * (barW + barGap);
      const barY = yScale(rate);
      const barH = Math.max(1, plotY + plotH - barY);
      ctx.fillStyle = color;
      drawRoundedRect(ctx, barX, barY, barW, barH, 5);
      ctx.fill();
      drawCanvasText(ctx, fmtRateNumber(rate), barX + barW / 2, Math.max(y + 56, barY - 24), {
        size: grouped.length > 10 ? 15 : 17,
        weight: 800,
        color: exportCanvasColor("text"),
        align: "center",
      });
    });
    ctx.font = exportCanvasFont(grouped.length > 10 ? 15 : 16, 800);
    const labelText = chartRegion ? truncateCanvasText(ctx, String(label), Math.max(52, groupW - 10)) : String(label);
    drawCanvasText(ctx, labelText, xCenter, plotY + plotH + 24, {
      size: grouped.length > 10 ? 15 : 16,
      weight: 800,
      color: exportCanvasColor("muted"),
      align: "center",
      maxWidth: groupW - 4,
    });
  });
  ctx.restore();
}

function exportAreaDetailRows(items) {
  const groupKey = state.province ? "district" : "province";
  return groupBy(items, groupKey)
    .filter(([label]) => label && label !== "ไม่ระบุ")
    .map(([label, rows]) => {
      const metric = exportDetailMetric(rows);
      return { label, rows, ...metric };
    })
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 7);
}

function drawExportDetailList(ctx, items, x, y, width, height) {
  const title = state.province ? "ผลรายอำเภอ" : "ผลรายจังหวัด";
  drawExportChartFrame(ctx, x, y, width, height, title);
  const pill = state.province ? state.province : state.region ? `เขตสุขภาพที่ ${state.region}` : exportPreviewScopeTitle();
  drawExportPill(ctx, pill, x + width - 18, y + 18, { maxWidth: 150, size: 17 });
  const rows = exportAreaDetailRows(items);
  if (!rows.length) {
    drawCanvasText(ctx, "ไม่มีข้อมูล", x + width / 2, y + height / 2, { size: 22, align: "center", color: exportCanvasColor("muted") });
    return;
  }
  const rowH = Math.min(72, (height - 82) / rows.length);
  const startY = y + 70;
  rows.forEach((row, index) => {
    const rowY = startY + index * rowH;
    if (index > 0) {
      ctx.strokeStyle = "#e4eef3";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 20, rowY - 8);
      ctx.lineTo(x + width - 20, rowY - 8);
      ctx.stroke();
    }
    ctx.fillStyle = "#dff7f4";
    drawRoundedRect(ctx, x + 22, rowY, 34, 34, 11);
    ctx.fill();
    drawCanvasText(ctx, String(index + 1), x + 39, rowY + 6, { size: 18, weight: 800, color: "#008b87", align: "center" });
    const metric = Number.isFinite(row.value) ? row.value : 0;
    const percent = Number.isFinite(row.value) ? fmtRateNumber(row.value) : "-";
    drawCanvasFitText(ctx, row.label, x + 70, rowY - 2, 180, { size: 22, minSize: 17, weight: 800, maxLines: 1 });
    drawCanvasText(ctx, `${fmtInt(row.rows.length)} อปท. · ${exportDetailMetric(row.rows).label}`, x + 70, rowY + 28, {
      size: 15,
      weight: 700,
      color: exportCanvasColor("muted"),
      maxWidth: 230,
      maxLines: 1,
    });
    const barX = x + width - 198;
    const barY = rowY + 13;
    ctx.fillStyle = "#e7f3f3";
    drawRoundedRect(ctx, barX, barY, 110, 12, 6);
    ctx.fill();
    ctx.fillStyle = exportCanvasColor("green");
    drawRoundedRect(ctx, barX, barY, Math.max(4, Math.min(110, metric * 110)), 12, 6);
    ctx.fill();
    drawCanvasText(ctx, percent, x + width - 22, rowY + 4, { size: 20, weight: 800, align: "right" });
  });
}

function svgElementToDataUrlWithStyles(svgElement) {
  if (!svgElement) return "";
  const clone = svgElement.cloneNode(true);
  clone.removeAttribute("id");
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = collectExportCssText();
  clone.insertBefore(style, clone.firstChild);
  return svgToDataUrl(new XMLSerializer().serializeToString(clone));
}

async function renderExportPreview() {
  if (!els.exportImagePreviewPanel || !els.exportPreviewImage || !exportPreviewOpen) return;
  const token = ++exportRenderToken;
  try {
    const canvas = await renderExportSlideCanvas();
    if (token !== exportRenderToken) return;
    els.exportPreviewImage.src = canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Cannot render export preview.", error);
  }
}

/*
 * The image export is canvas-first. The preview image and every downloaded file
 * are generated from the same canvas so typography and wrapping stay identical.
 */
async function drawExportCanvas(ctx, canvas) {
  const items = filterRecords();
  const summary = summarize(items);
  const mode = exportPreviewScopeType();
  const chartRegion = state.region || regionForProvince(state.province);
  const barItems = chartRegion
    ? filterRecords(["region", "province", "district", "quick"]).filter((record) => String(record.region) === String(chartRegion))
    : filterRecords(["region", "quick"]);
  const W = canvas.width;
  const H = canvas.height;
  const margin = 58;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  drawExportHeader(ctx, margin, 58, W - margin * 2);
  drawExportKpis(ctx, summary, margin, 205, W - margin * 2);

  const mainY = 360;
  const mainH = 610;
  const gap = 18;
  let mapImage = null;
  const mapUrl = svgElementToDataUrlWithStyles(els.thaiMapSvg);
  if (mapUrl) {
    try {
      mapImage = await loadImage(mapUrl);
    } catch (error) {
      console.warn("Cannot include map in export canvas.", error);
    }
  }

  if (mode === "area") {
    const mapW = 560;
    const detailW = 465;
    const chartW = W - margin * 2 - mapW - detailW - gap * 2;
    const chartX = margin + mapW + gap;
    const detailX = chartX + chartW + gap;
    const chartH = (mainH - gap) / 2;
    drawExportMapCard(ctx, margin, mainY, mapW, mainH, mapImage);
    drawExportLineChart(ctx, items, chartX, mainY, chartW, chartH);
    drawExportBarChart(ctx, barItems, chartRegion, chartX, mainY + chartH + gap, chartW, chartH);
    drawExportDetailList(ctx, items, detailX, mainY, detailW, mainH);
  } else {
    const mapW = 650;
    const chartX = margin + mapW + gap;
    const chartW = W - margin * 2 - mapW - gap;
    const chartH = (mainH - gap) / 2;
    drawExportMapCard(ctx, margin, mainY, mapW, mainH, mapImage);
    drawExportLineChart(ctx, items, chartX, mainY, chartW, chartH);
    drawExportBarChart(ctx, barItems, chartRegion, chartX, mainY + chartH + gap, chartW, chartH);
  }

  drawCanvasText(ctx, "จัดทำโดย กองงานคณะกรรมการควบคุมผลิตภัณฑ์ยาสูบ กรมควบคุมโรค", margin, H - 54, {
    size: 18,
    weight: 700,
    color: exportCanvasColor("muted"),
    maxWidth: 900,
  });
  drawCanvasText(ctx, `วันที่อัปเดตข้อมูล: ${MANUAL_UPDATED_AT_LABEL}`, W - margin, H - 54, {
    size: 18,
    weight: 700,
    color: exportCanvasColor("muted"),
    align: "right",
  });
}

function exportPreviewFileName(format = selectedExportFormat) {
  const scope = exportFileSafe(exportPreviewScopeTitle()) || exportFileSafe(exportScopeLabel()) || `year_${state.year}`;
  return `LPA_Summary_${state.year}_${scope}.${format}`;
}

function collectExportCssText() {
  return [...document.styleSheets]
    .map((sheet) => {
      try {
        return [...sheet.cssRules].map((rule) => rule.cssText).join("\n");
      } catch (error) {
        return "";
      }
    })
    .join("\n");
}

function inlineComputedExportStyles(sourceNode, cloneNode) {
  const sourceElements = [sourceNode, ...sourceNode.querySelectorAll("*")];
  const cloneElements = [cloneNode, ...cloneNode.querySelectorAll("*")];
  sourceElements.forEach((sourceElement, index) => {
    const cloneElement = cloneElements[index];
    if (!cloneElement || !(sourceElement instanceof Element)) return;
    const computed = window.getComputedStyle(sourceElement);
    const computedText = [...computed]
      .map((property) => `${property}:${computed.getPropertyValue(property)};`)
      .join("");
    const existingStyle = cloneElement.getAttribute("style") || "";
    cloneElement.setAttribute("style", `${existingStyle};${computedText}`);
  });
}

function svgToDataUrl(svgText) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Cannot create export image."));
    }, type, quality);
  });
}

function triggerBlobDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function renderExportSlideCanvas({ jpegBackground = false } = {}) {
  if (!els.exportCanvas) throw new Error("Export canvas is not available.");
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const canvas = els.exportCanvas;
  canvas.width = 1920;
  canvas.height = 1080;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await drawExportCanvas(context, canvas);
  if (jpegBackground) {
    context.globalCompositeOperation = "destination-over";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = "source-over";
  }
  return canvas;
}

function makePdfFromJpegDataUrl(jpegDataUrl, imageWidth, imageHeight) {
  const binary = atob(jpegDataUrl.split(",")[1]);
  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let offset = 0;
  const pageWidth = 960;
  const pageHeight = 540;

  const appendText = (text) => {
    const bytes = encoder.encode(text);
    chunks.push(bytes);
    offset += bytes.length;
  };
  const appendBinary = (text) => {
    const bytes = new Uint8Array(text.length);
    for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index);
    chunks.push(bytes);
    offset += bytes.length;
  };
  const beginObject = (number) => {
    offsets[number] = offset;
    appendText(`${number} 0 obj\n`);
  };
  const endObject = () => appendText("\nendobj\n");

  appendText("%PDF-1.4\n%\u00ff\u00ff\u00ff\u00ff\n");
  beginObject(1);
  appendText("<< /Type /Catalog /Pages 2 0 R >>");
  endObject();
  beginObject(2);
  appendText("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  endObject();
  beginObject(3);
  appendText(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  endObject();
  beginObject(4);
  appendText(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${binary.length} >>\nstream\n`);
  appendBinary(binary);
  appendText("\nendstream");
  endObject();
  const content = `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Im0 Do Q`;
  beginObject(5);
  appendText(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  endObject();

  const xrefOffset = offset;
  appendText(`xref\n0 6\n0000000000 65535 f \n`);
  for (let number = 1; number <= 5; number += 1) {
    appendText(`${String(offsets[number]).padStart(10, "0")} 00000 n \n`);
  }
  appendText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let cursor = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, cursor);
    cursor += chunk.length;
  });
  return new Blob([output], { type: "application/pdf" });
}

async function handleExportImageDownload() {
  if (!els.downloadExportPreview) return;
  const format = selectedExportFormat;
  const originalText = els.downloadExportPreview.textContent;
  els.downloadExportPreview.disabled = true;
  els.downloadExportPreview.textContent = "กำลังสร้างไฟล์";
  try {
    if (format === "pdf") {
      const canvas = await renderExportSlideCanvas({ jpegBackground: true });
      const pdfBlob = makePdfFromJpegDataUrl(canvas.toDataURL("image/jpeg", 0.92), canvas.width, canvas.height);
      triggerBlobDownload(pdfBlob, exportPreviewFileName("pdf"));
      return;
    }
    const canvas = await renderExportSlideCanvas({ jpegBackground: format === "jpg" });
    const blob = await canvasToBlob(canvas, format === "jpg" ? "image/jpeg" : "image/png", 0.92);
    triggerBlobDownload(blob, exportPreviewFileName(format));
  } catch (error) {
    console.error("Cannot export image preview.", error);
    window.alert("ไม่สามารถสร้างไฟล์รูปสรุปได้ กรุณารีเฟรชตัวอย่างแล้วลองใหม่อีกครั้ง");
  } finally {
    els.downloadExportPreview.disabled = false;
    els.downloadExportPreview.textContent = originalText || `ดาวน์โหลด ${format.toUpperCase()}`;
  }
}

function setExportPreviewOpen(isOpen) {
  exportPreviewOpen = isOpen;
  if (!els.exportImagePreviewPanel || !els.exportImagePreviewToggle) return;
  els.exportImagePreviewPanel.hidden = !isOpen;
  els.exportImagePreviewToggle.classList.toggle("is-active", isOpen);
  els.exportImagePreviewToggle.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("export-modal-open", isOpen);
  if (isOpen) {
    renderExportPreview();
    if (els.downloadExportPreview) {
      els.downloadExportPreview.disabled = false;
      els.downloadExportPreview.removeAttribute("title");
      els.downloadExportPreview.textContent = `ดาวน์โหลด ${selectedExportFormat.toUpperCase()}`;
    }
    window.setTimeout(() => {
      if (els.closeExportPreview) els.closeExportPreview.focus({ preventScroll: true });
    }, 0);
  } else {
    els.exportImagePreviewToggle.focus({ preventScroll: true });
  }
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
  renderExportPreview();
}

function updateStateFromControls(options = {}) {
  const { clearSearch = false } = options;
  state.region = els.region.value;
  state.province = els.province.value;
  syncRegionFromSelectedProvince();
  state.district = els.district.value;
  state.type = els.type.value;
  if (clearSearch) {
    state.search = "";
    if (els.search) els.search.value = "";
    hideOrgSearchSuggestions();
  }
  state.rankView = els.rankView ? els.rankView.value : "best";
  state.rankMetric = els.rankMetric.value;
  state.page = 1;
  state.rankPage = 1;
  render();
}

[els.region, els.province, els.district, els.type].filter(Boolean).forEach((el) => {
  el.addEventListener("change", () => updateStateFromControls({ clearSearch: true }));
});
[els.rankView, els.rankMetric].filter(Boolean).forEach((el) => {
  el.addEventListener("change", () => updateStateFromControls());
});
async function loadSelectedYear(selectedYear) {
  if (!els.year) return;
  selectedYear = Number(selectedYear || els.year.value);
  if (!Number.isFinite(selectedYear)) return;
  els.year.value = String(selectedYear);
  Object.assign(state, { year: selectedYear, region: "", province: "", district: "", type: "", search: "", rankView: "best", rankMetric: "overall", rankPage: 1, quick: "all", page: 1, pageSize: 10 });
  if (els.search) els.search.value = "";
  hideOrgSearchSuggestions();
  if (els.rankView) els.rankView.value = "best";
  els.rankMetric.value = "overall";
  els.pageSize.value = "10";
  if (recordsByYear.has(selectedYear)) {
    records = recordsByYear.get(selectedYear);
    state.year = selectedYear;
    dataSourceMode = staticCachedYears.has(selectedYear) ? "static" : (liveCachedYears.has(selectedYear) ? "live" : "cache");
    dataSourceLabel = staticCachedYears.has(selectedYear)
      ? `โหลดข้อมูลจากไฟล์บน GitHub Pages · ปี ${state.year}`
      : (liveCachedYears.has(selectedYear)
        ? `เชื่อมข้อมูลสดจาก Google Sheets · ปี ${state.year}`
        : `ข้อมูลที่เคยโหลดไว้ในเครื่อง · ปี ${state.year}`);
    renderWithTrendPreload();
    if (!staticCachedYears.has(selectedYear)) {
      syncStaticMetaAfterCache(selectedYear, {
        year: selectedYear,
        availableYears,
        dataRevision,
        generatedAt,
        records: recordsByYear.get(selectedYear),
      });
    }
    return;
  }
  const cachedPayload = await readBrowserCache(selectedYear);
  if (cachedPayload) {
    applyCachedPayload(cachedPayload, selectedYear);
    renderWithTrendPreload();
    syncStaticMetaAfterCache(selectedYear, cachedPayload);
    return;
  }
  setLoading(true, `กำลังโหลดข้อมูลปี ${selectedYear}`);
  let keepLoadingOverlay = false;
  try {
    dataSourceMode = "loading";
    dataSourceLabel = `กำลังโหลดไฟล์ข้อมูลบน GitHub Pages · ปี ${selectedYear}`;
    const staticLoaded = await loadStaticRecords(selectedYear, { timeoutMs: 20000 });
    const liveLoaded = staticLoaded ? true : await loadLiveRecords(selectedYear);
    if (liveLoaded || fallbackRecords.length) {
      renderWithTrendPreload();
    } else {
      showLoadError(selectedYear);
      keepLoadingOverlay = true;
    }
  } finally {
    if (!keepLoadingOverlay) setLoading(false);
  }
}

if (els.year) {
  els.year.addEventListener("change", () => {
    loadSelectedYear(Number(els.year.value));
  });
}
if (els.search) {
  els.search.addEventListener("input", renderOrgSearchSuggestions);
  els.search.addEventListener("focus", () => {
    if (normalizeSearchText(els.search.value)) renderOrgSearchSuggestions();
  });
  els.search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      selectOrgSearchSuggestion(0);
    }
    if (event.key === "Escape") {
      hideOrgSearchSuggestions();
    }
  });
}
if (els.searchSuggestions) {
  els.searchSuggestions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-index]");
    if (!button) return;
    selectOrgSearchSuggestion(Number(button.dataset.index));
  });
}
document.addEventListener("pointerdown", (event) => {
  if (!els.search || !els.searchSuggestions) return;
  if (els.search.contains(event.target) || els.searchSuggestions.contains(event.target)) return;
  hideOrgSearchSuggestions();
});
quickButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.quick = button.dataset.quick;
    state.page = 1;
    state.rankPage = 1;
    hideOrgSearchSuggestions();
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
    if (state.province || state.district) {
      Object.assign(state, { province: "", district: "", page: 1, rankPage: 1 });
    } else if (state.region) {
      Object.assign(state, { region: "", province: "", district: "", page: 1, rankPage: 1 });
    }
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
  const defaultYear = Number((window.LPA_CONFIG || {}).defaultYear || Math.max(...availableYears) || state.year);
  const currentControlYear = Number(els.year ? els.year.value : state.year);
  if (currentControlYear !== defaultYear && els.year) {
    loadSelectedYear(defaultYear);
    if (window.matchMedia("(max-width: 760px)").matches) setMobileFilterOpen(false);
    return;
  }
  Object.assign(state, { region: "", province: "", district: "", type: "", search: "", rankView: "best", rankMetric: "overall", rankPage: 1, quick: "all", page: 1, pageSize: 10 });
  els.search.value = "";
  hideOrgSearchSuggestions();
  if (els.rankView) els.rankView.value = "best";
  els.rankMetric.value = "overall";
  els.pageSize.value = "10";
  render();
  if (window.matchMedia("(max-width: 760px)").matches) setMobileFilterOpen(false);
});

if (els.exportExcel) {
  els.exportExcel.addEventListener("click", handleExportExcel);
}

if (els.exportImagePreviewToggle && els.exportImagePreviewPanel) {
  els.exportImagePreviewToggle.addEventListener("click", () => {
    setExportPreviewOpen(!exportPreviewOpen);
  });
}

if (els.refreshExportPreview) {
  els.refreshExportPreview.addEventListener("click", renderExportPreview);
}

if (els.closeExportPreview) {
  els.closeExportPreview.addEventListener("click", () => setExportPreviewOpen(false));
}

if (els.exportImagePreviewPanel) {
  els.exportImagePreviewPanel.addEventListener("click", (event) => {
    if (event.target.closest("[data-export-close]")) setExportPreviewOpen(false);
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && exportPreviewOpen) setExportPreviewOpen(false);
});

exportFormatButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedExportFormat = button.dataset.exportFormat || "png";
    exportFormatButtons.forEach((item) => item.classList.toggle("is-active", item === button));
    if (els.downloadExportPreview) {
      els.downloadExportPreview.textContent = `ดาวน์โหลด ${selectedExportFormat.toUpperCase()}`;
    }
  });
});

if (els.downloadExportPreview) {
  els.downloadExportPreview.disabled = false;
  els.downloadExportPreview.removeAttribute("title");
  els.downloadExportPreview.textContent = `ดาวน์โหลด ${selectedExportFormat.toUpperCase()}`;
  els.downloadExportPreview.addEventListener("click", handleExportImageDownload);
}

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
      syncStaticMetaAfterCache(state.year, cachedPayload);
      return;
    }
    const staticLoaded = await loadStaticRecords(state.year, { timeoutMs: 20000 });
    const loaded = staticLoaded ? true : await loadLiveRecords();
    if (loaded) {
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
