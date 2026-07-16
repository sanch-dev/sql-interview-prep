---
name: daily-data-engineer-job-digest
description: Daily Data Engineer job-search digest for Sanchit Dass, emailed via AgentMail at 8 AM.
---

DAILY DATA ENGINEER JOB DIGEST — v5 (target-companies only, batched f_C, cached IDs, ATS JSON)

OBJECTIVE: Produce an extensive daily report of Data Engineer openings at Sanchit's 43 target companies (via LinkedIn) plus 15 company career sites, ranked and emailed. This is a TARGETED report (no generic keyword discovery) — coverage of the named companies is the point. Never fabricate postings: every job in the output must be a real posting with a real canonical URL actually retrieved. If a source yields nothing, say so.

BROWSER: Use the connected Claude Chrome extension on the Personal profile (LinkedIn logged in there). Verify LinkedIn is logged in first; if it shows a login wall, note it and continue with career sites.

BROWSER TIMEOUT HANDLING (learned 2026-07-08 — this cut a run from very slow to much faster): LinkedIn's job pages run continuous background traffic (chat polling, analytics beacons, websocket keepalives) that the extension's "wait for document_idle" check watches for — it rarely fully settles. A read tool (get_page_text/read_page/find/screenshot) called immediately after navigate/click is NOT a fast failure if the page isn't ready — it internally waits the FULL 45 seconds before returning an error. That 45s tax repeats on every retry, so naively "just trying" is actually the slow path, not the fast one.
- ALWAYS insert an explicit wait (computer action, 5-8s for LinkedIn, 8-10s for Phenom People career sites like Cisco/Adobe) immediately after navigate/click, BEFORE calling any read tool. Never call a read tool as the very next action post-navigation.
- If a specific tab fails 2 consecutive times even after waits, STOP retrying in that tab — open a fresh tab (tabs_create_mcp) and retry there instead. A tab's idle-detection state can get wedged by leftover network handles from prior navigations in that same tab; a new tab reliably clears this (confirmed: a MongoDB job-view page failed ~4 times in one tab even with increasing waits, then rendered on the first attempt in a brand-new tab).
- Batch navigate→wait→read sequences into one browser_batch call where possible instead of separate turns, to cut per-call round-trip overhead.

TIMESTAMP LOGGING (added 2026-07-08 — for diagnosing run duration): Get a real timestamp via Bash (`date "+%Y-%m-%d %H:%M:%S"`) — do NOT estimate or guess elapsed time from memory. Log every entry below, one per line, to:
  C:\Users\sanchit.d\.claude\scheduled-tasks\daily-data-engineer-job-digest\run-logs\{YYYY-MM-DD}.log
(create the run-logs folder if it doesn't exist). Format each line: `[HH:MM:SS] EVENT — detail`.
- RUN_START and RUN_END (compute and log TOTAL_DURATION at the end from these two).
- START/END for each major phase: Step 0 (company-ID cache), each Step 1 batch (1-5), each Step 2 site, filtering/verification, email composition, email sending.
- Any timeout, connection drop, or stuck-tab event AS IT HAPPENS — timestamp + which tool + which URL/tab + error text (e.g. "waited 45000ms for document_idle"), and the timestamp when it was resolved (retry succeeded / fresh tab opened / gave up and marked Skipped).
- Any deliberate slow-wait (8-10s Phenom-site waits, etc.) — timestamp + reason, so slow-but-working steps are distinguishable from genuinely stuck ones.
- If LinkedIn or a career site appears to have dropped the connection (page stops responding entirely, not just slow) log it explicitly as CONNECTION_DROP with timestamp and what was attempted to recover.
At RUN_END, compute total duration and a per-phase breakdown (sum of timestamps between each phase's START/END), and include this breakdown in the FINAL summary (see OUTPUT section — timing metrics ARE wanted now, this reverses the earlier "no timing metrics" instruction).

CANDIDATE PROFILE:
Name: Sanchit Dass | Email: sdass979665@gmail.com
Experience: ~5 years Data Engineer | Current: ₹30 LPA
Location: Pune, India | Willing to relocate: Bangalore, Hyderabad | India-based only
Stack: Azure, Databricks, Spark/PySpark, Kafka, Airflow, SQL, Delta Lake, Fabric
Domain: FinTech & Wealth Management

================================================================================
STEP 0: LOAD / BUILD THE COMPANY-ID MAP (one-time, then cached)

The batched search below needs each company's numeric LinkedIn ID(s). Maintain a cache file:
  C:\Users\sanchit.d\.claude\scheduled-tasks\daily-data-engineer-job-digest\company-ids.json
Format: { "Razorpay": "3788927,13616753,2770855", "Google": "...", ... }

On each run:
1. Read company-ids.json if it exists. Seed value already known: Razorpay = 3788927,13616753,2770855
2. For any of the 43 companies NOT yet in the cache, resolve it ONCE:
   - Navigate to https://www.linkedin.com/company/{slug}/jobs/
   - read_page (interactive); find the "Search" link — its href contains f_C={ids} (may be several comma-separated IDs; KEEP ALL of them).
   - If the slug 404s or is wrong, use LinkedIn search to find the company's page, then open its /jobs/ tab and grab f_C the same way.
   - Store "Company Name": "id1,id2,..." in the cache.
3. Write the updated company-ids.json back so future runs skip resolution.
Resolve patiently/sequentially (this hits linkedin.com). It only happens for companies not already cached, so after the first run this step is near-instant.

The 43 companies (suggested slugs; correct via search if a slug fails):
Cisco (cisco), DoorDash (doordash), HP (hp), Wells Fargo (wells-fargo), Postman (getpostman), Uber (uber-com), PwC (pwc), Barclays (barclays-bank-plc), Bajaj Finserv (bajaj-finserv), Google (google), Apple (apple), JPMorgan (jpmorganchase), Amazon (amazon), Microsoft (microsoft), IBM (ibm), Deloitte (deloitte), Morgan Stanley (morgan-stanley), Atlassian (atlassian), CRED (cred-club), Razorpay (razorpay), Databricks (databricks), Confluent (confluent), Salesforce (salesforce), BlackRock (blackrock), Goldman Sachs (goldman-sachs), Visa (visa-inc-), Mastercard (mastercard), American Express (american-express), Capital One (capital-one), Flipkart (flipkart), PhonePe (phonepe), Paytm (paytm), Walmart Global Tech (walmart-global-tech), Snowflake (snowflake-computing), MongoDB (mongodbinc), Adobe (adobe), ServiceNow (servicenow), Groww (groww), Zerodha (zerodha), Freshworks (freshworks), Meta (meta), Netflix (netflix), Stripe (stripe)

================================================================================
STEP 1: WATCHLIST SEARCH — BATCHED (this replaces 43 separate checks)

LinkedIn job search accepts MULTIPLE company IDs in one f_C param. Group all resolved IDs into batches of ~10 companies and run ONE search per batch (≈5 searches total for 43 companies):

  https://www.linkedin.com/jobs/search/?keywords=Data%20Engineer&location=India&f_C={comma-joined IDs for the batch}&sortBy=DD

IMPORTANT: Do NOT apply a 24h filter here — we want ALL currently-open DE roles at these companies, not just last-24h. Sort by most recent.

For each batch search:
- Navigate, then read: get_page_text (title/company/location/recency) + read_page interactive (card links → canonical https://www.linkedin.com/jobs/view/{jobId}/).
- Adaptive pagination: page 1 always; go to page 2 only if page 1 is full (25 results) AND still relevant; stop when a page is mostly off-target. Rarely beyond page 2.
- If a batch fails/blocks, log under Skipped and continue.
Deduplicate by jobId across batches.
If a company returns 0 in the batch, that's fine (no open DE roles today) — do not separately re-check unless trivial.

================================================================================
STEP 2: CAREER SITES (15) — KNOWN-WORKING URLS PER COMPANY (learned 2026-07-07 run)

15 sites: Google, Apple, Amazon, Microsoft, Databricks, Snowflake, Salesforce, Atlassian, Razorpay, Uber, Adobe, Cisco, Wells Fargo, Goldman Sachs, Postman

Collect per posting: source site, company, title, location, work mode, posted date if shown, canonical url, skills, salary band if listed, seniority.

GREENHOUSE JSON (fast path, no browser — fetch via WebFetch, filter results client-side to Data Engineer / India):
- Postman:    https://boards-api.greenhouse.io/v1/boards/postman/jobs  — WORKS.
- Databricks: https://boards-api.greenhouse.io/v1/boards/databricks/jobs  — WORKS (often 0 India DE matches — that's a valid result, not a failure).
- Razorpay:   https://boards-api.greenhouse.io/v1/boards/razorpaysoftwareprivatelimited/jobs  — WORKS. NOTE: token is "razorpaysoftwareprivatelimited", NOT "razorpay" (that 404s).
- Atlassian:  Greenhouse token "atlassian" 404s — Atlassian is NOT on Greenhouse under that name. Use their own Browse Jobs filter page instead — base URL https://www.atlassian.com/company/careers/all-jobs . CORRECTION (2026-07-08 second run): navigating DIRECTLY to a URL with team=/location= query params pre-set (e.g. .../all-jobs?team=Data%2C%20Analytics%20%26%20Research&location=India) does NOT reliably apply the filters — it can render "0 RESULTS" even though the same filter combination works fine when applied via clicks. This looks like client-side JS state that isn't hydrated from the URL on cold load. RELIABLE METHOD: navigate to the bare https://www.atlassian.com/company/careers/all-jobs page, then find()/click the "Data, Analytics & Research (N)" function checkbox, then find()/click the "India (N)" location checkbox — i.e. interactive clicks, not URL params. On 2026-07-08 (first attempt, via clicks) this returned 6 genuine India postings: 3× Senior Data Engineer (Bengaluru or Remote), 1× Principal Data Engineer (hard-exclude), 2× Senior Data Engineering Manager (management track, not IC matches). Job detail links follow https://www.atlassian.com/company/careers/details/{id} — get them via read_page/find() on the job title links in the results table (get_page_text alone only shows title+location, not the href). Note: this site also throws the standard 45s document_idle timeout somewhat often — apply the same wait-first/fresh-tab handling as everywhere else.
- Snowflake:  Greenhouse tokens "snowflake" and "snowflakecomputing" both 404. Use browser fallback: https://careers.snowflake.com/us/en/search-results?keywords=Data%20Engineer&location=India — this loads but as of 2026-07-07 returned zero India matches (valid negative result).

BROWSER PATH — these exact URLs/steps are confirmed working, use them directly instead of guessing:
- Google: https://www.google.com/about/careers/applications/jobs/results/?q=Data%20Engineer&location=India
  Navigate + wait ~2s + get_page_text gives clean title/location/experience-level text directly. For canonical per-job URLs, read_page(interactive) or find() on the job title text — links are relative, resolve against https://www.google.com/about/careers/applications/ (e.g. "jobs/results/{id}-{slug}").
- Apple: https://jobs.apple.com/en-in/search?search=Data%20Engineer&location=india-INDC
  Navigate + wait ~2s + get_page_text gives a clean results list (title/team/date/location). Canonical URLs via find() on title text, e.g. https://jobs.apple.com/en-in/details/{id}-{n}/{slug}
- Microsoft: https://apply.careers.microsoft.com/careers?query=Data+Engineer&location=India&sort_by=relevance
  IMPORTANT: do NOT use jobs.careers.microsoft.com (redirects) and do NOT pass q=/lc= params (they get silently dropped, returning an unfiltered global list). Must use query=/location= on apply.careers.microsoft.com directly, OR click into the page's own search box (top-left "Search by job title..." + "City, state, or country/region" fields) and click "Search jobs" — typing via ref-based click sometimes silently fails, coordinate-based click works reliably. Canonical URLs: https://apply.careers.microsoft.com/careers/job/{id}
  Many India "Data Engineer" query hits are titled "Consultant - Data & AI" / "Senior Consultant - Data & AI" (Microsoft Industry Solutions/GCID) — check years-required in the JD (4-6 yrs = keep, "Senior" ones often need 10+ yrs = hard-exclude via >8yr rule) — these are genuine strong DE-skill matches (Azure Data Factory, Fabric, Synapse, Databricks, Airflow, Spark, Kafka) despite the non-"Engineer" title.
- Wells Fargo: https://www.wellsfargojobs.com/en/jobs/?search=Data+Engineer&city=HYDERABAD (or &city=BENGALURU)
  IMPORTANT: location=India as free text returns "no jobs found" — the location filter is a strict dropdown of specific cities, not free text. Use city=HYDERABAD or city=BENGALURU (their two main India hubs). Real "Senior/Lead Data Engineer" titles at Wells Fargo are usually US-based (Irving TX, Charlotte NC, Iselin NJ, Raleigh NC) — India-based matches tend to be "Data Management Analyst" / "Data Science Consultant" (Data & Analytics category) instead. Canonical URLs: https://www.wellsfargojobs.com/en/jobs/r-{id}/{slug}/
- Goldman Sachs: https://higher.gs.com/results?search=Data%20Engineer&sort=RELEVANCE
  Use /results (not /roles) with a plain ?search= param — this works directly, no need to click the search box manually. India roles appear titled like "Engineering - Client Data Engineering - Data Engineer - Analyst - Bengaluru" and various "Lakehouse and AI Data Platform Engineer" (careful: many of these are VP-level = hard-exclude).
- Salesforce: https://www.salesforce.com/company/careers/jobs/?search=Data%20Engineer&country=India
  NOTE: the country=India filter works reliably, but the search= keyword param does NOT actually filter results — it silently returns the unfiltered India list. Must manually scan the ~50+ India results for Data Engineer-relevant titles (as of 2026-07-07: zero were Data Engineer-titled — all Software Engineering MTS/SMTS/PMTS, Customer Success, Sales).
- Amazon: FIXED 2026-07-16 — do NOT use the browser (amazon.jobs is heavily JS-rendered and returns nothing via WebFetch or browser navigation, confirmed blocked across 4 separate runs 2026-07-07 through 2026-07-16). Instead use Amazon's own internal JSON search endpoint directly via curl/Bash (works — plain unauthenticated GET, no browser needed):
  `curl -s "https://www.amazon.jobs/en/search.json?base_query=Data+Engineer&country=IND&result_limit=100" -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"`
  IMPORTANT: use `country=IND` (not `loc_query=India`) — loc_query only biases relevance and still returns mostly non-India results; country=IND properly restricts the result set (returned 96 total India matches, 53 literally "Data Engineer"-titled, on 2026-07-16). Response is JSON — save to a file and parse with PowerShell (`ConvertFrom-Json`) since this environment has no python/jq/node on PATH. Useful fields per job: `title`, `city`, `country_code`, `posted_date`, `basic_qualifications` (regex `(\d+)\+?\s*years?` extracts min-years directly, no need to open each JD — huge time saver vs. Cisco's approach), `job_path` (canonical URL = `https://www.amazon.jobs` + job_path). Filter jobs where title matches "Data Engineer" (case-insensitive) and apply the usual hard-exclude check on title (Manager/Director/Principal/Head/VP) — on 2026-07-16 none of the 53 needed exclusion, max was 7 years. Amazon's India DE roles are now covered directly by this endpoint — no longer reliant on the LinkedIn Watchlist step as a fallback.
- Adobe: https://careers.adobe.com/us/en/search-results?keywords=Data%20Engineer — WORKS, but is SLOW (Phenom People platform). An early get_page_text (~3-4s) sees a broken pre-render state (literal "${pageStateData.searchKeyword}" text). Wait 8+ seconds before reading — it resolves to real results (114 India matches on 2026-07-07: "Data engineer" Bangalore R166484, "Software Development Engineer"/Senior Data Engineer Databricks+PySpark+Azure Noida R169130, etc). To scope to India only, click the "India (N)" checkbox under the Country facet (dismiss the cookie-consent banner first — it can eat the click). Canonical URLs: https://careers.adobe.com/us/en/job/{jobId}/{slug}
- Cisco: https://careers.cisco.com/global/en/search-results?keywords=Data%20Engineer — WORKS (same Phenom People platform as Adobe — also needs an 8+ second wait). BUT: a bare "Data Engineer" keyword match-ranks on the word "Engineer" alone and surfaces ~1000 irrelevant results (Consulting Engineer, ASIC Engineer, SRE, etc. all outrank real Data Engineer postings under "Most Relevant"). FIX: wrap the keyword in literal quotes — https://careers.cisco.com/global/en/search-results?keywords=%22Data%20Engineer%22 — this exact-phrase search cut 2026-07-07's results from ~1000 down to 22 total / 19 in India, ALL genuinely "Data Engineer"-titled (Snowflake, ETL, Oracle, dbt, Python skill matches). Apply this same quoted-phrase trick to Adobe and any other Phenom/broad-matching site if results look noisy. Canonical URLs: https://careers.cisco.com/global/en/job/{jobId}/{slug} (dismiss cookie banner before clicking any facet checkboxes, same as Adobe).
- Uber: https://jobs.uber.com/en/jobs/ — PARTIALLY works but the data is unreliable. First page load can show "Loading jobs…" indefinitely (network trace showed only one Joveo widget init call, no follow-up jobs-data call — looked like automation detection). On a later attempt in the same run it DID eventually render a real job list (after dismissing a cookie-consent dialog that silently eats clicks on the search/location inputs) — but every single listing was tagged "Job removed", and typing into the search/location boxes + clicking Search did not actually filter the URL or results (stayed on the unfiltered 61-page list). Treat Uber as unreliable rather than definitively blocked: worth a quick retry each run (dismiss the cookie dialog FIRST, then fill search+location, then check if the URL picked up query params before trusting any results), but don't sink much time into it — the "Job removed" tagging suggests the data itself may be stale/broken on their end, not just an automation quirk. Fall back to LinkedIn watchlist for Uber if it doesn't cooperate quickly.

================================================================================
FILTERING & RANKING

TOTAL RANK SCORE = seniority_score + skill_match_score + comp_score + watchlist_bonus.
- SENIORITY_SCORE (+1 each where applicable): Data Engineer / Analytics Engineer; Senior DE / DE II / DE III; Cloud DE / Data Platform Engineer; ETL / Big Data Engineer; Staff DE.
- HARD EXCLUDE (list under Excluded with reason, don't rank): Director/VP/Head/Principal; roles requiring >8 years.
- SKILL_MATCH_SCORE = count in posting (0-14): Azure, Databricks, PySpark, Spark, Kafka, Airflow, SQL, Delta Lake, Fabric, Snowflake, lakehouse, streaming, ETL/ELT, data pipelines.
- COMP_LIKELIHOOD: 🟢 beats 30L (3): explicit >₹30L OR (watchlist co + Senior/II/III). 🟡 possibly (2). ⚫ unclear/unlikely (1).
- WATCHLIST_BONUS: +2 (all Step-1 companies are watchlist; career-site companies on the 43-list also get it).
Sort by: recency first, then rank score desc.

MANDATORY >8-YEAR CHECK (learned 2026-07-07 — do not skip this): title alone does NOT tell you years-required. On 2026-07-07 a Databricks "Staff Data and AI Engineer, Finance" was placed in Top Picks purely because "Staff" sounded senior-but-fine — the actual JD required 12+ years, which should have been a hard exclude. "Staff"/"Lead"/"Principal"/"Senior" titles at different companies map to wildly different actual year requirements (Visa's "Staff Data Engineer" only needed 6-9 years; Databricks' needed 12+) — the title is not a reliable proxy.
- Before placing ANY posting in Top Picks or Strong Matches (not just skimming the title), open the full job description and find the literal years-of-experience line, then apply the >8yr hard-exclude mechanically against that number, not against the title.
- If the JD won't render after a couple of retries (LinkedIn's description pane sometimes gets stuck on a skeleton loader indefinitely, independent of company) do NOT silently include the posting anyway. Either retry via a fresh tab, cross-check the company's own career site/ATS for the same posting, or if genuinely unverifiable, mark it in the email with an explicit "⚠️ years-of-experience not verified — check before assuming fit" note rather than presenting it as a clean match.
- This check matters MOST for "Staff"/"Principal"/"Lead"/senior-sounding titles since those are exactly where >8yr requirements cluster — don't skip it just because the role already looks impressive.

================================================================================
OUTPUT: HTML EMAIL(S)

TEMPLATE (fixed 2026-07-08 — the prior dark-theme div-based template rendered as illegible/overlapping text in Gmail; Gmail's auto-dark-mode rewriting clashes unpredictably with custom dark backgrounds+light text, especially on nested divs. CONFIRMED WORKING via test send 2026-07-08 — use this pattern, do not revert to a dark theme):
- Light theme only. `<meta name="color-scheme" content="light">` and `<meta name="supported-color-schemes" content="light">` in `<head>` to stop clients auto-dark-moding it.
- Table-based layout throughout (`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">`), not nested `<div>`s — tables are the reliably-supported cross-client pattern for email.
- Body background `#f2f4f7`; content card `#ffffff`, `max-width:640px`, centered, `border-radius:8px`.
- Header band: `background-color:#1f2937` (dark) with white bold text — this ONE element is fine dark since it's a single opaque table cell, not a text-on-near-matching-background situation.
- Body text: dark on light throughout — headings/titles `#111827`, secondary/meta text `#6b7280`, links `#2563eb` underlined. Never light-gray-on-dark or white-on-dark for the main content.
- Job cards: bordered table cells (`border:1px solid #bfdbfe` for Top Picks tinted `bgcolor="#eff6ff"`, `border:1px solid #e5e7eb` plain for other tiers), NOT div-with-border-radius-and-dark-bg.
- Stats row: use a visible separator between stat items (e.g. render as `Total collected: 83 &nbsp;|&nbsp; Excluded: 39 &nbsp;|&nbsp; Displayed: 44` within one cell, or give each `<td>` a right border) — plain adjacent `<td>`s with no separator run together illegibly (caught in the 2026-07-08 test send).
- Badges (NEW/etc.) as small pill spans: `background-color:#fef3c7;color:#92400e;border-radius:3px;padding:1px 5px`.
- Always set `font-family:Arial,Helvetica,sans-serif` explicitly on every styled element (inherited fonts don't reliably propagate through tables in all clients).

Include ALL qualifying postings — aim extensive, don't truncate to a handful.
HEADER: "[YYYY-MM-DD] Data Engineer Job Digest — India (Target Companies)" + stats: Total collected | Excluded | Displayed | Last-24h | Likely-beats-30L | Companies-with-openings (with visible separators per above).
SECTIONS: 1) 🔥 Just Posted (last 24h)  2) ⭐ Top Picks (score 7+)  3) 📌 Strong Matches (5-6)  4) 📄 Other Relevant (3-4)  5) 🚫 Excluded (with reason)  6) ⚠️ Skipped Sources (with reason).
JOB CARD: Company (bold) | Title | Location/Mode | Posted X ago; badges 🟢🟡⚫, ⭐ watchlist, seniority, 🔥 if <24h; 3-5 skill pills; one-line fit reason; verified https:// apply link; salary if shown.

================================================================================
EMAIL SENDING (AgentMail)

Send via the AgentMail tools from inbox "sanchit-job-digest@agentmail.to" (inboxId = that address) to sdass979665@gmail.com. Send BOTH:
- Email 1 — Subject "LinkedIn Job Digest — [YYYY-MM-DD]" — postings from Step 1 (watchlist via LinkedIn).
- Email 2 — Subject "Company Career Sites Job Digest — [YYYY-MM-DD]" — postings from Step 2 (career sites).
Each: full HTML body + plain-text fallback. Confirm message id per send; on failure retry once, then report it.

FINAL: brief factual summary — companies with openings, total displayed, top 3-5 picks, any skipped sources — PLUS a timing summary: total run duration, per-phase breakdown, and a list of any timeout/connection-drop/slow-processing events with their timestamps (from the run log — see TIMESTAMP LOGGING above).
END PROMPT