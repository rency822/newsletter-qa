# Test fixtures (not committed)

The tests read real, private files from this folder. They are git-ignored so internal schedule data and newsletter emails never reach the repository. Put these files here before running `npm test` or `npm run e2e`:

| File | What it is |
|---|---|
| `schedule-2026-10.html` | The October 2026 content-schedule page, saved from the browser ("Webpage, HTML only") |
| `radicalcash-2026-10-26.eml` | RadicalCash newsletter, release Oct 26, 2026 |
| `kennyspennies-2026-10-26.eml` | Kenny's Pennies newsletter, release Oct 26, 2026 |
| `indiebucks-2026-10-21.eml` | IndieBucks Fetish newsletter, release Oct 21, 2026 |
| `indiebucks-list-2026-10-21.txt` | The coworker's `code - Title` list for that IndieBucks release (17 lines) |

The expected counts in the tests (e.g. RadicalCash: 38 matched, 9 missing) are tied to these exact files.
