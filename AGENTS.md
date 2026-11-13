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
- Session 3 blocks 1-3 done: text extraction for text/PDF,
  document-type detection on upload, and an MT700 LC parser that
  stores structured values in Document.extractedData (JSONB).
  GET document-set returns both docType and extractedData.
- Block 3 extra check passed on samples/set-c/lc-mt700.txt: the
  parsed documentsRequired includes CERTIFICATE OF ORIGIN, so the
  parser reads the actual file rather than hardcoded set A values.
- No rule engine and no AI calls yet.

## How to run
1. `docker compose up -d` in the root (PostgreSQL 16, port 5432,
   user lcuser, db lcchecker, volume lc-data).
2. API: `apps/api` — NestJS, port 3000. Health: GET /health.
3. Web: `apps/web` — Vite React, port 5173, CORS already allows it.
Note: this Mac also has a Homebrew PostgreSQL; its service was stopped
on purpose so Docker owns port 5432. Restart it only if asked:
`brew services start postgresql@18`. Prisma is pinned to 6.19.3.

## Architecture
- apps/api: NestJS + Prisma. Tables: DocumentSet (one checking job),
  Document (one uploaded file; docType is detected, extractedData
  holds parsed LC values).
- Uploaded files are stored on disk under `uploads/<setId>/` with
  unique names. The database stores only records (names, paths, sizes).
- Upload accepts PDF and plain text only, max 10 MB. Others get 400.
- apps/web: one Korean page — create a set, upload files, see the list.

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
Session 3: value extraction. Read each uploaded document's text,
identify its type, and pull the fields the 15 rules need into a
structured, stored form. This is the hardest part of the project;
take it document type by document type, starting with the LC (MT700).

## Working style
The owner does not write code; he directs in small steps and reviews
each step before the next. Do not build ahead of instructions.
Explain what each step does in plain words. UI text is Korean;
sample documents are English (real-world trade standard).
Update the "Current status" section of this file at the end of
every session.
