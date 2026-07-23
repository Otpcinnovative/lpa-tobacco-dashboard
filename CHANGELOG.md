# Changelog

## Current: v2.6 live multi-year dashboard

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
