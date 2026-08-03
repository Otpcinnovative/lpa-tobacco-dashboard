# Changelog

## Current: v2.19 live multi-year dashboard

- Preserved the accepted V2.18 dashboard as `versions/v2.18/`.
- Enlarged the OTPC logo by controlling its visual height so it is closer to the LPA title scale while keeping mobile layout balanced.
- Hardened live Google Sheet loading with cache-busted Apps Script requests, JSONP cache busting, retries, and longer per-attempt timeouts.
- Prevented the dashboard from silently rendering zero-count KPI cards when live loading fails and no fallback row data is available; the loading overlay now shows a clear data-loading issue instead.
- Updated cache-busting asset query strings and the visible dashboard version badge to V2.19.

## v2.18 live multi-year dashboard

- Preserved the accepted V2.17 dashboard as `versions/v2.17/`.
- Enlarged the OTPC logo in the dashboard header for desktop, portrait tablet, and mobile layouts.
- Reworked the health-region/province bar chart labels so province names display horizontally, with larger and bolder category labels and clearer axis-title labels.
- Improved initial load performance by rendering the selected year as soon as live data is available, then preloading other years in the background instead of blocking the loading overlay.
- Used country-level summary data for the default yearly trend chart when no filters are active, reducing the need to load every year of row-level data before users can start reading the dashboard.
- Updated cache-busting asset query strings and the visible dashboard version badge to V2.18.

## v2.17 live multi-year dashboard

- Preserved the accepted V2.16 dashboard as `versions/v2.16/`.
- Added explicit cache-busting query strings to the CSS, config, logo, and app script assets so GitHub Pages users receive the newest V2.17 code instead of cached V2.15/V2.16 assets.
- Kept the V2.16 visual and chart behavior changes unchanged.
- Updated the visible dashboard version badge to V2.17.

## v2.16 live multi-year dashboard

- Preserved the accepted V2.15 dashboard as `versions/v2.15/`.
- Reduced the spacing between the LPA title block and the Thai dashboard description.
- Added the OTPC logo to the top-right of the dashboard header using `assets/logo-otpc.jpg`.
- Updated the bar chart behavior: the default view compares health regions, while selecting a health region changes the chart to compare provinces within that region.
- Kept the province comparison chart contextual; selecting a province still leaves all provinces in the selected health region visible for comparison.
- Updated the visible dashboard version badge to V2.16.

## v2.15 live multi-year dashboard

- Preserved the accepted V2.14 dashboard as `versions/v2.14/`.
- Reworked the page heading into an LPA-first title with "(Local Performance Assessment)" and a two-line Thai description.
- Moved the pass criteria and cut-base notes below the KPI cards so users see the main numbers before reading interpretation notes.
- Renamed the total KPI label to "อปท. ทั้งหมด" and made KPI labels more prominent.
- Renamed the yearly line chart, health-region bar chart, and Thailand map placeholder to match owner feedback.
- Kept the province ranking panel unchanged; no data structure, Google Sheet, or Apps Script changes in this version.
- Updated the visible dashboard version badge to V2.15.

## v2.14 live multi-year dashboard

- Preserved the accepted V2.13 dashboard as `versions/v2.13/`.
- Renamed the province ranking views to "พื้นที่ที่ควรติดตาม" and "พื้นที่ที่ดำเนินการได้ดี".
- Changed province ranking detail text from "ควรสนับสนุน" to "ควรติดตาม".
- Stacked the province ranking controls on desktop so the view selector appears above the indicator selector, matching the mobile layout.
- Updated the visible dashboard version badge to V2.14.

- Preserved the accepted V2.12 dashboard as `versions/v2.12/`.
- Renamed the province ranking panel to "ผลการดำเนินงาน อปท. ด้านการควบคุมผลิตภัณฑ์ยาสูบรายจังหวัด".
- Added a province ranking view selector for "พื้นที่ที่ควรสนับสนุน" and "พื้นที่ที่ดำเนินงานเด่น".
- Simplified ranking indicators to "ภาพรวม", "ด้าน อปท.", and "ด้านสถานศึกษา".
- Changed positive ranking bars to green/teal while keeping support-oriented rankings in amber/red.
- Updated the visible dashboard version badge to V2.13.

- Preserved the accepted V2.11 dashboard as `versions/v2.11/`.
- Kept the loading overlay visible on initial page load until yearly trend data has finished preloading.
- Prevented the yearly line chart from briefly appearing with only the selected year before the remaining years load.
- Added a preload timeout so the dashboard does not remain stuck on the loading overlay if one yearly request is delayed too long.
- Updated the visible dashboard version badge to V2.12.

- Preserved the accepted V2.10 dashboard as `versions/v2.10/`.
- Added a compact mobile filter summary bar so phone users see the current year, area, and view without scrolling through all filters.
- Changed mobile filters into an openable bottom sheet while keeping the full desktop filter layout unchanged.
- Kept the yearly line chart as a line chart on mobile, but gave it an internal horizontal scroll width so trend labels remain readable.
- Updated the visible dashboard version badge to V2.11.

- Preserved the accepted V2.9 dashboard as `versions/v2.9/`.
- Reduced side-specific quick-filter KPI views to two cards so they show only the selected side's count and proportion.
- Reworked the yearly line chart, health-region bar chart, and status donut so quick filters use the same interpretation as the selected KPI view.
- Changed side-specific chart modes to show the percentage needing follow-up from the relevant denominator instead of mixing pass-rate series from the other side.
- Improved mobile trend-chart fitting by removing the forced horizontal minimum width.
- Updated the visible dashboard version badge to V2.10.

- Preserved the pre-context-KPI/mobile-filter dashboard as `versions/v2.9-pre-context-kpi-mobile-filter/`.
- Reworked KPI cards to change by quick-filter mode so side-specific follow-up views show only the relevant side.
- Kept the "both sides failed" KPI only in the overall follow-up quick-filter view.
- Improved portrait/mobile filter density by capping filter height and arranging quick filters in a compact two-column layout.
- Updated the visible dashboard version badge to V2.9.

- Preserved the pre-KPI-detail/version-badge dashboard as `versions/v2.8-pre-kpi-detail-version-badge/`.
- Clarified KPI detail text so pass/fail counts identify whether they use all organizations or the school-side denominator.
- Added school-side missing-data counts to the KPI card alongside pass, fail, denominator, and cut-base counts.
- Added a small fixed version badge at the bottom-right of the dashboard.

- Preserved the pre-quick-filter-clarity dashboard as `versions/v2.7-pre-quick-filter-clarity/`.
- Renamed the quick filters from broad side labels to follow-up labels so users understand they filter problem groups, not switch KPI modes.
- Added contextual notes when quick filters are active to explain why KPI values can change sharply after selecting a follow-up side.

- Preserved the pre-GitHub-prep dashboard as `versions/v2.7-pre-github-prep/`.
- Added public GitHub Pages preparation files: `.gitignore`, `.nojekyll`, and `README.md`.
- Clarified the current dashboard version heading in this changelog.

- Preserved the pre-follow-delta dashboard as `versions/v2.6-pre-follow-delta/`.
- Changed the follow-up KPI delta so a lower follow-up count is treated as improvement and shown in green, with both count and percentage change from the previous year.

- Preserved the pre-year-context dashboard as `versions/v2.5-pre-year-context/`.
- Added a year-context note so users can see when overall results are based on LPA-side only or when school-side data is pilot/comparable.
- Added the overall calculation basis to the "LPA needing follow-up" KPI card.
- Added a subtle 2567 marker to the yearly trend chart to show the start of pilot school-side data.

- Preserved the pre-V2.3 dashboard as `versions/v2.3-pre-ui-refine/`.
- Refined V2.3 UI toward a cleaner official/minimal layout with IBM Plex Sans Thai.
- Removed explanatory/status guide text from the header and analysis panels.
- Removed the status filter and data-quality/check-data UI from the public dashboard.
- Replaced indicator 44/45 labels with side-based labels for LPA-side and school-side tobacco control work.
- Reworked KPI cards into four decision-focused cards: LPA count in view, LPA-side pass, school-side pass, and LPA needing follow-up.
- Removed decorative KPI blobs and replaced them with subtle left color bars.
- Recomputed overall status in the dashboard by year logic: 2565-2566 use LPA-side only; 2567-2568 use both comparable sides.
- Changed the health-region chart to keep all 12 regions visible while highlighting the selected region.
- Moved the multi-year line chart above the health-region bar chart and connected it to current filters using cached year data.
- Added a footer with preparing office, phone number, update date, and live-data status.
- Polished the V2.3 layout: full organization name in the title, right-aligned reset button, larger trend/bar charts, adjusted trend labels to avoid overlap, and reordered quick filters to match the KPI flow.
- Added a loading overlay for year changes when live Google Sheet data is still loading, preventing users from reading stale figures as the newly selected year.
- Added live-year cache switching in the dashboard so years already loaded from Apps Script can be shown instantly without a repeated request.
- Changed initial page load to show the loading overlay immediately and wait for live data before the first dashboard render, avoiding a fallback-data flash on entry.

- Preserved previous dashboard as `versions/v2.0-pre-google-sheet/`.
- Preserved the pre-multi-year dashboard as `versions/v2.2-pre-multi-year/`.
- Added Google Sheet live-data configuration in `assets/config.js`.
- Connected the dashboard config to the deployed Apps Script `/exec` endpoint.
- Added Apps Script JSON/JSONP endpoint template in `apps_script/Code.gs`.
- Updated dashboard loader to fetch live Google Sheet data first and fall back to embedded 2568 data if the endpoint is not deployed or unavailable.
- Improved perceived load speed by rendering fallback data immediately while Google Sheet live data loads in the background.
- Added an Apps Script helper `rebuildApiYearSheets()` to create year-specific API sheets such as `api_rows_2568`, reducing repeated full-sheet scans.
- Added a dashboard year filter for 2565-2568 live data.
- Added multi-year country trend data from `summary_country`.
- Added UI logic for years where school-side data is not comparable: 2565-2566 show no comparable school KPI instead of a zero or failure rate.
- Added deployment instructions in `apps_script/README.md`.

## v1-final prototype

- Preserved previous dashboard as `versions/v1.7/`.
- Changed the health-region chart background to plain white.

## v1.7 prototype

- Preserved previous dashboard as `versions/v1.6/`.
- Changed health-region bars to have square bottoms while keeping a slight rounded top.

## v1.6 prototype

- Preserved previous dashboard as `versions/v1.5/`.
- Changed health-region bar value labels to horizontal text above bars.
- Removed `%` from bar value labels because the axis is already labeled as percentage.

## v1.5 prototype

- Preserved previous dashboard as `versions/v1.4/`.
- Expanded the health-region bar chart to better fill the panel.
- Changed the Y-axis label from `ร้อยละผ่าน` to `ร้อยละ`.
- Increased grouped bar width and plot area while keeping chart margins balanced.

## v1.4 prototype

- Preserved previous dashboard as `versions/v1.3/`.
- Further compacted portrait/tablet filter and top layout to reduce first-screen height.
- Rebuilt health-region bar chart as SVG with Y-axis numeric scale, axis labels, and bar value labels.
- Adjusted bar corners to be more rectangular.
- Kept indicator 45 as yellow and indicator 44 as blue for clearer contrast.
- Expanded province priority row layout and added both count and percentage in ranking labels.
- Added both count and percentage to the action-status legend.

## v1.3 prototype

- Preserved previous dashboard as `versions/v1.2/`.
- Improved mobile/portrait filter layout to avoid a tall internal scrolling filter box.
- Added axis labels to the health-region vertical bar chart.
- Reduced vertical bar rounding to a moderate radius.
- Changed indicator 45 chart/KPI accent color to yellow for clearer contrast from indicator 44.
- Limited province priority ranking to 5 rows per page with `<` and `>` pagination.
- Changed table pagination buttons to `<` and `>`.
- District summary now appears only after selecting a province.
- Removed the data-quality column from the local action table.
- Marked "ต้องติดตามทั้งสองด้าน" as red in the overview column.

## v1.2 prototype

- Preserved previous dashboard as `versions/v1.1/`.
- Changed filter area to a full-width sticky bar.
- Added quick filters for all, follow-up, school-side, LPA-side, and data-quality issues.
- Limited mobile filter bar height to reduce screen takeover.
- Changed health-region comparison from horizontal bars to vertical grouped bars.
- Added a placeholder line chart area for future multi-year trend data.
- Enlarged the action-status donut chart and moved labels below it.
- Added a compact district-level summary section.
- Aligned indicator 44 and 45 color usage across KPI cards, legends, and charts.

## v1.1

- Added criteria notes for pass, cut-base, and missing values.
- Added chart legend colors for indicators 44 and 45.
- Renamed province ranking to focus on provinces with more non-pass/follow-up areas.
- Split province and district columns in the LPA table.
- Added table pagination and page size controls.
- Table defaults to province sorting and prioritizes follow-up rows after drilling into province/district.

## v1.0

- Initial dashboard prototype from cleaned LPA 2568 data.
- White public-health dashboard style.
- Filters by health region, province, district, LPA type, status, and search.
- KPI cards, health region comparison, province ranking, status chart, and LPA action table.
- Map placeholder reserved for future Thailand map.
