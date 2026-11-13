# AGENTS.md — LC Checker project handoff

## What this project is
A pre-check tool for exporters: it compares letter-of-credit terms
(MT700 text) against shipping documents (commercial invoice, packing
list, bill of lading, insurance certificate) and flags discrepancies
BEFORE the documents are presented to the bank. Banks deal with
documents only (UCP 600 Art. 5); a discrepancy means delayed payment
plus a fee, so catching errors early is the whole point.

## Current status (2026-11-13)
- Session 1 done: concept and the 15 checking rules are fixed (below).
- Session 2 done: skeleton + file upload + passing e2e tests,
  pushed to GitHub (public, jeonghoheo/lc-checker).
- Session 3 done, blocks 1-5: text extraction for text/PDF,
  document-type detection on upload, an MT700 LC parser, and
  DeepSeek AI extraction for invoices, packing lists, bills of
  lading, and insurance with code-side validation. Extracted values
  are stored in Document.extractedData (JSONB); GET document-set
  returns both docType and extractedData.
- Block 3 extra check passed on samples/set-c/lc-mt700.txt: the
  parsed documentsRequired includes CERTIFICATE OF ORIGIN, so the
  parser reads the actual file rather than hardcoded set A values.
- Block 4 live invoice extraction passed against the real DeepSeek
  API (HB-INV-2026-041, USD 48,000, 10,000 units, 2 items).
- Block 5 live extraction passed for packing list, bill of lading,
  and insurance. Their known sample values were stored correctly.
- Session 4 done: added `presentationDate`, CheckRun/CheckResult,
  `PATCH /document-sets/:id/presentation-date`, and
  `POST /document-sets/:id/check`, plus all 15 deterministic rules.
- Session 4 scoring passed without live AI calls: set A has 0 FAIL,
  set B fails exactly rules 1, 2, 6, 8, 9, 12, and set C fails
  exactly rules 4, 5, 7, 10, 13, 14. Planted errors caught: 12/12.
- Session 5 done: borderline FAILs of rules 9, 11, and 12 get an AI
  second opinion stored as `aiReview` in CheckResult.detail. If the
  AI call fails, the check still completes without the advisory.
  Live spot checks: set B rule 9 -> discrepancy, synthetic rule 11
  typo -> likely_typo.

## How to run
1. `docker compose up -d` in the root (PostgreSQL 16, port 5432,
   user lcuser, db lcchecker, volume lc-data).
2. API: `apps/api` — NestJS, port 3000. Health: GET /health.
3. Web: `apps/web` — Vite React, port 5173, CORS already allows it.
Note: this Mac also has a Homebrew PostgreSQL; its service was stopped
on purpose so Docker owns port 5432. Restart it only if asked:
`brew services start postgresql@18`. Prisma is pinned to 6.19.3.

## Architecture
- apps/api: NestJS + Prisma. Tables: DocumentSet (one checking job,
  optional presentationDate), Document (one uploaded file; docType is
  detected, extractedData holds parsed LC values or AI-extracted
  document values), CheckRun (one execution of the rule engine), and
  CheckResult (one of the 15 rule results with status and detail JSON;
  borderline FAILs may also include an `aiReview` advisory).
- Uploaded files are stored on disk under `uploads/<setId>/` with
  unique names. The database stores only records (names, paths, sizes).
- Upload accepts PDF and plain text only, max 10 MB. Others get 400.
- `PATCH /document-sets/:id/presentation-date` sets the presentation
  date; `POST /document-sets/:id/check` stores and returns a check run.
- apps/web: one Korean page — create a set, upload files, see the list.
  The check results are not shown in the UI yet.

## Frozen scope (v1)
- Text-layer PDF and text files only. NO OCR (real scans are v2).
- No login/accounts. No design polish until the review screen session.
- DeepSeek API comes later, ONLY for value extraction and fuzzy
  judgments (is this wording a conflict or a typo?). Every comparison
  itself is plain deterministic code.
- The presentation date is a user input. It is NOT inside the documents.

## The 15 checking rules (the heart of the project)
Compared values follow UCP 600 Art. 14(d): data must not CONFLICT,
it does not have to be identical (unit conversion counts as equal).
- Dates (4): on-board date <= latest shipment date; presentation
  within 21 days of shipment (Art. 14(c)); presentation before LC
  expiry; insurance date not after shipment date.
- Numbers (4): invoice total <= LC amount; gross weight packing list
  vs bill of lading; quantity invoice vs packing list; carton count
  packing list vs bill of lading.
- Against the LC (4): invoice goods description corresponds to the LC
  (Art. 18(c)); ports match the LC; consignee matches; notify party
  matches.
- Presence (3): every document the LC requires is present; on-board
  notation exists on the bill of lading (Art. 20); endorsement exists
  where the bill of lading is negotiable.

## Sample data
3 sets of fictional documents (exporter: Hanbyeol Packaging Co., Ltd.,
cosmetic containers): set A clean, sets B and C with 6 planted errors
each plus one "looks wrong but is fine" trap each. An answer key maps
every planted error to the rule that must catch it. Extraction and
rules are graded against these sets.

## Next work
Session 3 value extraction, Session 4 rule engine, and Session 5 AI
advisory review are done. Next is showing check results and `aiReview`
advisories in the web review screen and adding the result report UI.
Not started yet.

## Working style
The owner does not write code; he directs in small steps and reviews
each step before the next. Do not build ahead of instructions.
Explain what each step does in plain words. UI text is Korean;
sample documents are English (real-world trade standard).
Update the "Current status" section of this file at the end of
every session.
