# SESSION.md — Session 3 work orders (written by the reviewer, executed by OpenCode)

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

## Block 2 — Document type detection (done)

In apps/api, add document-type detection based on extracted text:
- If the text contains MT700-style tags such as ":40A:" and ":20:", type is "LC".
- Else if it contains "COMMERCIAL INVOICE", type is "INVOICE".
- Else if it contains "PACKING LIST", type is "PACKING_LIST".
- Else if it contains "BILL OF LADING", type is "BILL_OF_LADING".
- Else if it contains "INSURANCE CERTIFICATE" or "INSURANCE POLICY", type is "INSURANCE".
- Otherwise type stays null.
Run detection automatically after upload, store the result in Document.docType, and include docType in the GET document-set response.
Add unit tests with the five sample document texts from samples/set-a and samples/set-c (insurance), each expecting its type above.
Run the tests and show me the results.

## Block 3 — Extract values from the letter of credit

In apps/api, add an LC parser for documents whose docType is "LC":
- Parse the MT700 text by its field tags and produce a structured object with: creditNumber (:20:), issueDate (:31C:), expiryDate and expiryPlace (:31D:), applicant (:50:), beneficiary (:59:), currency and amount (:32B:), tolerance (:39A:), portOfLoading (:44E:), portOfDischarge (:44F:), latestShipmentDate (:44C:), goodsDescription (:45A:), documentsRequired (:46A: as raw text), presentationDays (number parsed from :48:, e.g. 21).
- MT700 dates are YYMMDD: convert to ISO dates (26 -> 2026). Amount "USD48000,00" becomes currency "USD", amount 48000.00.
- Store the parsed object as JSON in a new nullable column on Document (extractedData) via a new Prisma migration, and return it in the GET document-set response.
- Add unit tests that parse samples/set-a/lc-mt700.txt and assert every field above against the known values.
Run the tests and show me the results.

## Block 3 extra check (hardcoding detection)
After Block 3 tests pass, run the same parser once on samples/set-b/lc-mt700.txt and record the extracted values in the log. Set B's LC has slightly different values, so if Set A's values come out, the parser is hardcoded.
