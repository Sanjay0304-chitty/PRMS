# Landlord dashboard revenue correction

The Total Revenue card now displays collected PAID payments for properties owned by the signed-in Landlord. It shows RM 0.00 when the loaded total is zero, and Unavailable with a retry option when payment data cannot be loaded.

The chart shows six calendar months grouped by paid date in Malaysia time. Months without payments are zero-filled. Missing paid dates and future-dated entries are excluded from the monthly chart. The all-time total remains independent of the six-month chart. The interface labels the amounts as simulated payments.

The old Sprint 6 messages were removed. View Finance opens the Landlord finance page. Export now generates a CSV containing loaded portfolio totals, outstanding payments and monthly collected amounts. Export is disabled while loading or when the dashboard is incomplete.

Verification on 16 November 2026:

- All 320 backend tests passed; frontend lint and production build passed; backend production build passed.
- Additional month-grouping tests cover Malaysia midnight/year rollover, missing dates, future dates, empty periods and decimal rounding.
- Read-only comparison confirmed the running API total matched the Landlord's PAID payment sum in MySQL: RM 1,000.00. It returned six monthly buckets with RM 1,000.00 in November 2026.
- Chrome visibly displayed that same total and chart. The temporary dashboard endpoint failures during the backend reload cleared after Retry dashboard.
- CSV generation and mounted download-link behaviour passed a controlled check against the actual export function. Automated download capture timed out, and browser policy prevented inspection of chrome://downloads. A completed download was therefore not independently confirmed in Chrome.

No payment records were created or changed for this verification. No commit or push was performed. This replaces the Landlord-dashboard placeholder limitation listed in the earlier security verification report.
