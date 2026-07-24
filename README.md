# LPA Tobacco Control Dashboard

Dashboard การดำเนินงานควบคุมผลิตภัณฑ์ยาสูบขององค์กรปกครองส่วนท้องถิ่น

## Current Version

V2.14 live multi-year dashboard

## Data Source

The public dashboard loads live data from Google Sheets through the configured Apps Script endpoint in `assets/config.js`.

The bundled `assets/lpa-data.js` file intentionally contains no row-level fallback data. If the live endpoint is temporarily unavailable, the dashboard shows a loading/fallback state rather than publishing local working data.

## Public Files

- `index.html`
- `assets/`
- `README.md`
- `CHANGELOG.md`
- `.nojekyll`

## Notes

Internal Excel files, cleaning scripts, master outputs, Apps Script source files, and local version backups are intentionally excluded from the public GitHub Pages repository.
