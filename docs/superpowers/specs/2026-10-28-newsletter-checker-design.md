# Newsletter Release Checker — Design

**Date:** 2026-10-28 · **Owner:** Rency Kalagayan · **Status:** Draft for review

## 1. Goal

Each week, affiliate programs send a "New Tube Clips & Content available!" newsletter. Before or after it goes out, we need to verify that it lists exactly the scenes that belong to that release, and flag anything missing, extra, unpublished, or mistitled.

The schedule site (`schedule.yppcdn…`) is the source of truth for published content, but it is reachable only through the VPN. The checker is therefore a self-contained web page. The user pastes or drops the inputs, and the page does all the work in the browser.

**Success:** For a given newsletter, the user gets a report within seconds. The report shows matched, missing, and needs-review scenes, and offers copy-ready problem text and a CSV. No manual cross-referencing is needed.

## 2. Programs and modes

| Program | Sender (seen so far) | Expected list comes from |
|---|---|---|
| RadicalCash | newsletter@radicalcash.com | Schedule HTML |
| Kenny's Pennies | support@customercare.co | Schedule HTML |
| IndieBucks | support@westbill.com | Coworker's weekly `code - Title` list |

The program is auto-detected from the email subject prefix (`RadicalCash -`, `KennysPennies -`, `IndieBucksFetish -`). Forwarded emails (`Fwd:`) are supported. The user can override the detected program with a dropdown.

## 3. Release window rule

- **Release date:** the date printed in the newsletter body (e.g. "October 26, 2026"). It is editable.
- **Generation date:** the last Thursday strictly before the release date. Example: release Mon Oct 26 → generated Thu Oct 22. It is editable.
- **Window:** from generation − 13 days to generation − 7 days, inclusive. This is the Friday→Thursday week that ends one week before generation. Example: Fri Oct 9 – Thu Oct 15.
- This rule was confirmed against the Oct 26 RadicalCash issue (all scenes Oct 9–15; AD4X's Oct 8 scene was excluded) and the Oct 26 Kenny's Pennies issue (13/13 scenes Oct 9–15).
- The window is used only in schedule mode (RadicalCash and Kenny's Pennies).

## 4. Inputs

1. **Schedule HTML** (schedule mode only). This is the saved or pasted schedule page. The user can add one or more pages, one per calendar month, and entries from all of them are merged.
2. **Newsletter** as a `.eml` file. The user can drop it or pick it from disk.
3. **Coworker list** (IndieBucks only). This is pasted text with one scene per line, in the form `code - Title`. The text is split on the first ` - `. Lines without a code (e.g. `Boyfriend experience - CSW`) are handled as title plus suffix.

## 5. Parsing

### 5.1 Schedule

- Each `button.calendar-event` yields one entry with these fields:
  - **site key:** the full `.event-domain` text, e.g. `Lildsplayhouse Tour - admin.lildsplayhouse.com`. It is split into a **label** (before ` - admin.`) and an **admin host** (after ` - `). The admin host is needed because two different sites both use the label `Sex Tapes` (`admin.sextapes.com` and `admin.studiovanniall.com`).
  - **media:** `hasVideo` / `hasPhoto`, from the `.media-flag.video` and `.media-flag.photo` elements
  - **title:** `.event-title`
  - **status:** the class `status-*`, one of published, scheduled, unpublished, or encoding
  - **date:** `data-day`
  - **ID:** `data-event`
- **Dedupe:** entries are merged when site label, normalized title, and date are all the same. For example, the `ypp_sticky_dirtyauditions` and `ypp_dirtyauditions` copies become one entry.
- **Test entries are dropped.** A title is treated as a test when it matches `^test\d*$`, starts with `TEST_`, or contains ` test ` (case-insensitive).
- **Coverage check:** the parser records which dates the pasted pages cover. If any window date is not covered, it shows a warning that names the missing dates.

### 5.2 Newsletter (.eml)

- The email reader decodes MIME, handling quoted-printable and base64 bodies, and selects the `text/html` part.
- Studio sections are found as the header text immediately preceding `Latest Tools`.
- Within a section, each scene contributes a title, a Video FHG URL (if present), and models (if present). The trailing slug of the FHG URL, e.g. `.../gallery/6ad9…/birthday-surprise`, is kept as a secondary match key.
- The release date is taken from the first `Month D, YYYY` line after the newsletter heading.
- There are two template variants. RadicalCash and Kenny's Pennies list Models, Tags, and TRAILER/FHG links per scene. IndieBucks lists a `THUMBNAIL RIGHT` marker and description per scene and has no FHG links. One parser handles both variants, and it is covered by fixtures from each program. Only the first scene in a section is preceded by `Latest Tools`; later scenes in the same section belong to the same studio.

## 6. Studio → program mapping

- A built-in table maps each studio to its program, its schedule site labels, and its newsletter header aliases.
- The user can edit the table in the page. Edits are saved in browser `localStorage`, with a "Reset to defaults" button.
- Each mapping label is either a plain label (it matches that label under any admin host) or `Label @ admin.host` (it matches only that admin host). For example, Sextapes is `Sex Tapes @ admin.sextapes.com`.
- **Sub-sites are combined into their parent studio.** BTS, Interviews, Reels, Premium/Sale, mobile, Season 2, Casting, and model sub-sites (listed in Appendix A) count as that studio. Generic sub-site labels that several networks share (`Reels`, `mobile content MA`, `BTS`, `Interviews`) are always host-qualified.
- **Sibling brands stay separate.** These share an admin host with a studio but are not its sub-sites, e.g. UpskirtJerk, BoppingBabes, and DownblouseJerk under `admin.wankitnow.com`, or the other TWM brands under `admin.topwebmodels.com`. The Oct 26 WANKITNOW section contains only WankItNow-labelled scenes, which confirms this.

The default table is in Appendix A. Studios marked *(guess)* were inferred and should be confirmed.

## 7. Matching

- **Title normalization:**
  - lowercase
  - `&` → `and`
  - strip apostrophes and quotes
  - replace other punctuation, including `–` and `-`, with spaces
  - collapse whitespace
- **Exact match:** the normalized titles are equal, or the newsletter's FHG slug equals the slugified schedule title.
- **Fuzzy match:** similarity is at least 0.85, measured by Dice coefficient on character bigrams. Candidates are compared only within the same studio.
- **Assignment:** each newsletter scene is paired one-to-one with its best candidate (greedy, best score first), so two schedule entries never share one newsletter scene.
- **Schedule mode:**
  - The expected set is every entry that meets all four conditions: status is published, the date is in the window, `hasVideo` is true, and the site maps to a studio of this program. Photo-only updates are excluded because these are tube-clip newsletters. Without this rule, Red-XXX's photo set "Resist Temptation." (Oct 11) would be reported missing.
  - Each newsletter scene is then compared against all schedule entries for its studio, across all dates and statuses, so that out-of-window and unpublished scenes can be classified.
- **IndieBucks mode:** the coworker list is the expected set. There is no studio mapping and there are no dates.
  - **Line parsing:** each line splits into a code (before the first ` - `), a title, and an optional trailing note in parentheses, e.g. `(No 10 min tube for this scene)`. The note is shown in the report and is not used for matching.
  - **Model hint from the code:** the code is split on `_`. The site prefix and IDs (e.g. `boyn1253`) and part markers (e.g. `part04`) are dropped. The remaining tokens (e.g. `romeotwink`, `mitchschif`) are compared with the newsletter scene's models, after the model names are lowercased and their spaces removed.
  - **Ranking score:** title Dice similarity plus 0.15 for each matching model token. The score is not capped, so `boyn1195` (title and model match) outranks `boyn1253` (title only) for the same newsletter scene. The same one-to-one greedy assignment is used as in schedule mode.
  - **Classification:** a pair whose title Dice is at least 0.85 is matched or fuzzy matched. A pair below that is a Title mismatch only if every model token in the code matched. Anything else is left unpaired.
  - **Mistitled line:** when a line's best pairing is a newsletter scene whose title differs but whose models match, the row is flagged ⚠️ **Title mismatch**. The row shows both titles.
  - **Typos:** close but inexact titles (e.g. "an Madrox & Yuri…" vs "Ian Madrox & Yuri…") are marked ✅ Fuzzy match.
  - **Fixture expectations** (the Oct 21 IndieBucks Fetish issue and the 17-line coworker list):
    - 16 matched or fuzzy matched
    - `boyn1253_romeotwink_mitchschif_part04`, listed as "Cute Boy Gets Punished & Fucked - Part 1", flagged ⚠️ Title mismatch against "Using A New Sub Boy - Part 4"
    - "Ticklish Sub Surrenders To Master Teko pure Tickling" flagged ⚠️ Not found, because it is in the newsletter but not in the list
    - 0 missing

## 8. Result statuses

| Status | Meaning |
|---|---|
| ✅ Matched | exact match to an expected scene |
| ✅ Fuzzy match | similarity ≥ 0.85; both titles are shown |
| ❌ Missing | expected scene not found in the newsletter |
| ⚠️ Outside window | the newsletter scene matches a published schedule entry dated outside the window |
| ⚠️ Not published | the newsletter scene matches an entry that is scheduled, unpublished, or encoding |
| ⚠️ Not found | no schedule entry (or coworker line) matches the newsletter scene |
| ⚠️ Unknown studio | the newsletter section header is not in the mapping table |
| ⚠️ Title mismatch | (IndieBucks) the coworker line's code models match a newsletter scene, but the titles differ |

## 9. Report UI

- **Header strip:** program · release date · generation date · window, followed by ✅ / ❌ / ⚠️ counts.
- **Results table**, grouped by studio, with these columns:
  - status
  - studio
  - newsletter title, with the schedule title shown underneath when it differs
  - schedule date
  - FHG link
  - code (IndieBucks only)
- **Filter buttons:** All / Problems / Missing / Review.
- **Copy problems:** copies plain text with one line per problem, e.g. `❌ WankItNow – Sensual Groove (Oct 13)`.
- **Download CSV:** downloads all rows.
- **Expected list:** an expandable section with `Studio – Title (date)` for every expected scene.
- **Mapping editor:** an expandable section (see §6).
- **Theme and layout:** light and dark themes; usable down to phone width.

## 10. Errors

- **Wrong file type**, or schedule HTML with no `calendar-event` entries: an inline error that names the problem.
- **Window not fully covered** by the pasted schedule: a warning that lists the missing dates, plus an "add another month" prompt.
- **No release date found:** the release-date field is left empty and highlighted. The report runs once the user fills it in.
- **Studios are never dropped silently.** Unknown ones always appear as ⚠️ rows.

## 11. Architecture

- The checker is a single self-contained HTML page with inline JS and CSS and no external requests. It is published as a private artifact, so the user opens it from a link.
- The JS is organized as small pure modules:
  - `eml` — MIME decode, returns the HTML part
  - `newsletter` — HTML → `{program, releaseDate, sections[{studio, scenes[{title, slug, fhg, models}]}]}`
  - `schedule` — HTML → `entries[]` plus coverage
  - `coworkerList` — text → `[{code, title}]`
  - `windowCalc` — release date → `{generation, start, end}`
  - `matcher` — normalize, score, assign, classify
  - `report` — renders the table, copy text, and CSV
- No data is persisted except the mapping edits.

## 12. Testing

- **Unit tests** (Node) use the real fixtures: the Oct 2026 schedule HTML and the RadicalCash, Kenny's Pennies, and IndieBucks `.eml` files. They assert that:
  - release Oct 26 → generation Oct 22 → window Oct 9–15
  - Kenny's Pennies: 13 matched; the only missing scene is Miss Malorie Switch "Wife Saves Your Job" (Oct 13), provided it stays mapped to Kenny's Pennies
  - RadicalCash: 38 newsletter scenes are all matched, and exactly these 9 are ❌ missing:
    - WankItNow: Work Me Out, Sexy Videro, Sensual Groove, Very Happy Ending
    - BigGulpGirls: Bad Bella
    - AmazingFilms: Jazz Gives Great Service
    - LaBellaDX: The Lesbian Animation Session
    - DoggVision: Misty Rein Threesome Behind the Scenes
    - Bemefi: StepSisterLove 6 Scene 2
  - "Balloon Tits Jennifer Is Back For More Of Roberts Cock" fuzzy- or exact-matches "…Robert's Cock"
  - the Dirty Auditions duplicates merge into one entry
  - `test1` through `test4` and `TEST_…` titles are excluded
  - the IndieBucks parser extracts all 18 scenes from the Oct 21 issue; the matching 17-line coworker list gives the results listed in §7 (IndieBucks mode)
- **End-to-end:** the built page is loaded in headless Chromium, the fixtures are fed in, and the summary counts are checked.

## 13. Out of scope

- Fetching the schedule automatically (a possible later option: drive the browser on the user's machine).
- Checking models (calendar entries carry no models).
- Generating or sending newsletters.
- Producing the IndieBucks coworker list.

## Appendix A — Default studio mapping

Format: **Studio** → schedule site label(s) · newsletter header.

### RadicalCash

| Studio | Schedule label(s) | Newsletter header |
|---|---|---|
| AD4X | AD4X, Casting @ admin.ad4x.com, Casting Party @ admin.ad4x.com, Pixie Dust @ admin.ad4x.com | AD4X |
| Alterotic | Alterotic, Kyla Keys, Madame Ouija, Maya Romero, Michelle Masque, Robin Coffins, Taylor Nicole, TigerLilly, Titi Ramone (all @ admin.alterotic.com) | ALTEROTIC |
| AmazingFilms | Amazing Films | AMAZING FILMS |
| BJRaw | BJ Raw, BJ Raw BTS, BJ Raw Interviews, Reels @ admin.bjraw.com | BJ RAW |
| DickHDdaily | Dick Hd Daily | DICK HD DAILY |
| DireDesires | Dire Desires, Premium @ admin.diredesires.com, Sale @ admin.diredesires.com | DIRE DESIRES |
| GotFilled | Gotfilled, Gotfilled BTS, Gotfilled Interviews, Reels @ admin.gotfilled.com | GOTFILLED |
| Hardwerk | Hard Werk | HARDWERK |
| Inserted | Inserted | INSERTED |
| JAV888 | JAV 888 | JAV 888 |
| JazztheStallion | jazzthestallion, mobile content MA @ admin.jazzthestallion.com | JAZZ THE STALLION |
| Lezkey | Lezkey | LEZKEY |
| LucidFlix | Lucid flix | LUCID FLIX |
| NikkiZee | Nikki Zee | NIKKI ZEE |
| Pervect | Pervect | PERVECT |
| PurgatoryX | Purgatory X | PURGATORY X |
| Ricky'sRoom | Ricky's Room, Ricky's Room BTS | RICKY'S ROOM |
| Sextapes | Sex Tapes @ admin.sextapes.com | SEX TAPES |
| YesGirlz | Yes Girlz | YES GIRLZ |
| LegendaryX | Legendaryx | LEGENDARYX |
| ZFilmz | Z Filmz Originals | Z FILMZ ORIGINALS |
| MyBoobs | My Boobs EU | MY BOOBS |
| MyBoobsUncensored | My Boobs Uncensored | MY BOOBS UNCENSORED |
| Bemefi | Bemefi | BEMEFI |
| POVPerv | POV Perv | POV PERV |
| FantasyPOV | FantasyPov | FANTASY POV |
| FreakMobMedia | FreakMobMedia | FREAK MOB MEDIA |
| FreakMobHardcore | FreakMobHardcore | FREAK MOB HARDCORE |
| SexyModernBull | Sexy Modern Bull | SEXY MODERN BULL |
| WankItNow | WankItNow | WANKITNOW |
| Javhub | JavHub | JAVHUB |
| DripDropProd | Drip Drop Prod, Membership Exclusive, Stories @ admin.dripdropprod.net, VOD Exclusive | DRIP DROP PROD |
| LukeCooper | Luke CooperX | LUKE COOPERX |
| TheArtemixxx | The Artemixxx | THEARTEMIXXX |
| LildPlayHouse | Lildsplayhouse Tour | LIL D'S PLAYHOUSE |
| ComeInside | Come Inside | COME INSIDE |
| TrashyNeverClassy | trashyneverclassy | TRASHY NEVER CLASSY |
| Eroutique | Eroutique | EROUTIQUE |
| SevereSex | severesexfilms.com | SEVERE SEX FILMS |
| Ricky's Resort | rickysresort, RickysResort Season 2 | RICKY'S RESORT |
| Milflicious | Milflicious | MILFLICIOUS |
| PoleVixens | PoleVixens | POLE VIXENS |
| SheHerGirls | She Her Girls | SHE HER GIRLS |
| CollectiveCorruption | CollectiveCorruption | COLLECTIVE CORRUPTION |
| MyAsianGFs | Myasiangfs | MY ASIAN GFS |
| WydeSyde | WydeSyde | WYDESYDE |
| MajestyNasty | Majestynasty, mobile Majestynasty MA | MAJESTY NASTY |
| CosplayXGirls | Cosplayxgirls | COSPLAYXGIRLS |
| BeastNKitty | Beastnkitty | BEASTNKITTY |
| DoggNuts | DoggNuts | DOGGNUTS |
| DoggVision | Doggvision | DOGGVISION |
| GingerVixen | gingervixen | GINGER VIXEN |
| GoGoWorldPorn | Gogo World Porn | GOGO WORLD PORN |
| LaBellaDX | Labelladx, Behind The Scenes @ admin.labelladx.com, Femdom Pegging, Slutwife Chronicles | LABELLADX |
| XXXTryout | xxxtryout | XXXTRYOUT |
| InMelanin | Inmelanin | INMELANIN |
| 2Girls1Camera | 2girls1camera | 2GIRLS1CAMERA |
| BigGulpGirls | BigGulpGirls | BIG GULP GIRLS |
| CougarSeason | CougarSeason | COUGAR SEASON |
| DeepThroatSirens | DeepthroatSirens | DEEPTHROAT SIRENS |
| FacialsForever | FacialsForever | FACIALS FOREVER |
| PoundedPetite | PoundedPetite | POUNDED PETITE |
| ShesBrandNew | ShesBrandNew | SHES BRAND NEW |
| TWMClassics | TWM Classics | TWM CLASSICS |
| TWMInterviews | TWM Interviews | TWM INTERVIEWS |
| HobyBuchanon | hobybuchanon, Hoby Buchanon BTS | HOBY BUCHANON |

### Kenny's Pennies

| Studio | Schedule label(s) | Newsletter header |
|---|---|---|
| MariskaX | MariskaX, MariskaX Fans | MARISKA X |
| YummyCouple | Yummy Couple | YUMMY COUPLE |
| Red-XXX | Red-xxx | RED XXX |
| MelodyPleasure | MelodyPleasure | MELODY PLEASURE |
| Lady-Lucy | lady-lucy | LADY-LUCY |
| Nicole Dupapillon | Nicole Dupapillon | NICOLE DUPAPILLON |
| Dacada | Dacada | DACADA |
| NylonPerv | Nylon Perv | NYLON PERV |
| JamieYoung | Jamie-Young | JAMIE-YOUNG |
| Lady-Sonia *(guess)* | Lady Sonia, Lady Sonia Mobile | LADY SONIA |
| Katerina Hartlova *(guess)* | katerina-hartlova | KATERINA HARTLOVA |
| MasterNico *(guess)* | masternico | MASTERNICO |
| MeanFeetFetish *(guess)* | Mean Feet Fetish | MEAN FEET FETISH |
| MissMalorieSwitch *(guess)* | Miss Malorie Switch | MISS MALORIE SWITCH |

Newsletter header matching is case- and punctuation-insensitive, so `LIL D'S PLAYHOUSE` also matches `Lil Ds Playhouse`. Headers not seen yet are best guesses and can be corrected in the page.
