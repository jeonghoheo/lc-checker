# SESSION.md — Session 4 work orders (written by the reviewer, executed by OpenCode)

## Working rules (fixed)
- When the owner says "Run Block N", execute only Block N below. One block at a time.
- Report everything in **English**: chat reports to the owner AND entries in SESSION-LOG.md. (Past log entries stay as they are.)
- At the end of each block, append a result summary to the bottom of SESSION-LOG.md in this format:
  ## Block N — title (date)
  - Done: ...
  - Tests: passed X / total Y (if any test fails, record the failure output as-is)
  - Notes: ...
- Then commit and push the code changes together with SESSION-LOG.md.
- If something fails, do not guess a fix. Record the failure output in the log as-is and stop.
- At the end of the last block of a session, also update the Current status section of AGENTS.md and push it together.

## Done so far
- Session 3 complete (2026-11-13): text extraction, document type detection, LC parser (hardcoding check passed on set C), AI extraction for invoice / packing list / bill of lading / insurance — live DeepSeek runs verified against known sample values.
- Block 6 — check plumbing + rules 1-8 (done 2026-11-13)
- Block 7 — rules 9-15 (done 2026-11-13)

## Shared definitions for Session 4 (all blocks)
- A check runs over one DocumentSet. Inputs are the documents' extractedData plus the set's presentationDate.
- Rule result statuses: PASS, FAIL, SKIPPED (a rule is SKIPPED, never FAIL, when a document or value it needs is missing; record the reason).
- Every FAIL result stores both compared values and a short message, so a report screen can show them side by side later.
- Name comparison (rules 11-12): take the first line / part before the first comma, uppercase, collapse whitespace, then compare for equality.
- Shipment date means the bill of lading's shippedOnBoardDate. Only rule 4 has a fallback (see Block 7).

## Block 6 — Check plumbing + rules 1-8 (dates and numbers) (done)

In apps/api:
- Add a nullable `presentationDate` (date) to DocumentSet via Prisma migration, plus `PATCH /document-sets/:id/presentation-date` accepting { "presentationDate": "2026-12-10" }.
- Add tables CheckRun (id, documentSetId, createdAt) and CheckResult (checkRunId, ruleNo, status, detail JSON) via migration.
- Add `POST /document-sets/:id/check`: runs the rule engine over the set, stores a CheckRun with one CheckResult per rule (15 rows), and returns the run with its results.
- Small extractor amendment: add `issueDate` (the B/L "Place and Date of Issue", ISO) to the bill of lading extraction schema, its mocked fixture, and its unit test (set A: 2026-11-25).
- Implement rules 1-8 as pure functions over extractedData:
  1. B/L shippedOnBoardDate <= LC latestShipmentDate.
  2. presentationDate minus shippedOnBoardDate <= LC presentationDays days. SKIPPED if presentationDate is not set.
  3. presentationDate <= LC expiryDate. SKIPPED if presentationDate is not set.
  4. (Implemented in Block 7 with the other document rules — return SKIPPED "not implemented yet" in this block.)
  5. Invoice totalAmount <= LC amount adjusted by LC tolerance percent (tolerance "00/00" means no excess allowed), and invoice currency == LC currency.
  6. Packing list totalGrossWeightKg == B/L totalGrossWeightKg.
  7. Invoice totalQuantity == packing list totalQuantity.
  8. Packing list totalCartons == B/L totalCartons.
  Rules 9-15 also return SKIPPED "not implemented yet" in this block, so a check run always stores 15 results.
- Unit tests for rules 1-8: for each rule one passing case and one failing case built from the sample values (e.g. rule 1 fails with shipped 2026-12-02 vs deadline 2026-11-30; rule 5 fails with invoice 48,500 vs LC 48,000).
Run the tests and show me the results.

## Block 7 — Rules 9-15 (cross-checks and presence) (done)

Implement the remaining rules as pure functions over extractedData:
  9. Goods description: take significant words from the LC goodsDescription (words of length >= 4, excluding AND/WITH/FROM/ONLY/GOODS), uppercase. FAIL if any significant word is missing from the invoice items' descriptions joined together (case-insensitive). The FAIL detail lists the missing words. (Semantic/fuzzy matching is a later session; this block is the deterministic word check.)
  10. Ports: the first word of LC portOfLoading (e.g. BUSAN) must appear in the B/L portOfLoading, and the first word of LC portOfDischarge (e.g. HAMBURG) must appear in the B/L portOfDischarge (case-insensitive). FAIL names which port mismatched and both values.
  11. B/L consignee name == LC applicant name (name comparison as defined above).
  12. B/L notifyParty name == LC applicant name (same comparison).
  13. Required documents present: scan the LC documentsRequired text (uppercase) for these phrases — "CERTIFICATE OF ORIGIN" -> ORIGIN_CERTIFICATE; "INSURANCE CERTIFICATE" or "INSURANCE POLICY" -> INSURANCE; "COMMERCIAL INVOICE" -> INVOICE; "PACKING LIST" -> PACKING_LIST; "BILL OF LADING" or "BILLS OF LADING" -> BILL_OF_LADING. FAIL lists every required type that has no uploaded document of that type. (ORIGIN_CERTIFICATE can never be uploaded in v1 — that is a known limit, and it is exactly what set C tests.)
  14. B/L shippedOnBoardDate is not null. FAIL if null (no on-board notation).
  15. Endorsement: always SKIPPED in v1 with reason "endorsement is not extracted in v1".
  Rule 4 (from Block 6): insurance issueDate <= shipment date. Use shippedOnBoardDate; if it is null, fall back to the B/L issueDate and mark the result detail with "fallback": "blIssueDate". If there is no insurance document, SKIPPED.
- Unit tests: one pass and one fail case per rule from sample values (rule 9 fails when "AIRLESS" is missing from invoice items; rule 12 fails for notify "NORDLYS LOGISTICS GMBH"; rule 13 fails when the LC requires a certificate of origin that is not uploaded; rule 14 fails when shippedOnBoardDate is null; rule 4 fails for insurance 2026-11-28 vs shipment 2026-11-25).
Run the tests and show me the results.

## Block 8 — Scoring run against the planted errors (session 4 finale)

Add an e2e scoring test that builds three document sets from fixture extractedData matching the samples exactly (do not call the live API in this test):
- Set A fixtures (clean set), presentationDate 2026-12-10. Expect: 0 FAIL.
- Set B fixtures (B/L shipped on board 2026-12-02, B/L gross 1210 / cartons 480 vs packing 1250 / 500, invoice items missing the word "Airless", notify party "NORDLYS LOGISTICS GMBH"), presentationDate 2026-12-25. Expect FAIL on exactly rules {1, 2, 6, 8, 9, 12} and no other FAIL.
- Set C fixtures (insurance issueDate 2026-11-28, invoice total 48,500, B/L port of discharge Rotterdam, B/L shippedOnBoardDate null with issueDate 2026-11-25, packing totalQuantity 9,600 vs invoice 10,000, LC documentsRequired includes a certificate of origin), presentationDate 2026-12-10. Expect FAIL on exactly rules {4, 5, 7, 10, 13, 14} and no other FAIL.
The test asserts the exact FAIL rule sets above — any extra FAIL (a false positive on the trap items: set B's reordered shipper address, set C's general-terms packing description) fails the test.
Record the scorecard in SESSION-LOG.md: sets A/B/C, expected vs actual FAIL rules, planted errors caught 12 / 12.
Update AGENTS.md Current status (session 4 complete) and push everything together.
