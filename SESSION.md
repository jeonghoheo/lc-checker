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

## Done so far
- Block 1 — text extraction (done 2026-11-13)
- Block 2 — document type detection (done 2026-11-13)
- Block 3 — LC parser + hardcoding extra check on set C (done 2026-11-13)

## Block 4 — AI extraction base + commercial invoice

The remaining documents have no fixed tag format, so extraction uses the DeepSeek API (OpenAI-compatible chat endpoint) with a strict JSON schema, and plain code validates the result before storing.

In apps/api:
- Add an AiExtractionService that sends document text + a field list to DeepSeek (model from env DEEPSEEK_MODEL, default "deepseek-chat"; key from env DEEPSEEK_API_KEY) with JSON response format, parses the JSON, and returns it. If DEEPSEEK_API_KEY is missing, extraction must fail with a clear error message and the upload flow must keep the document with extractedData = null (do not break uploads).
- Add .env.example listing DEEPSEEK_API_KEY and DEEPSEEK_MODEL. Never commit a real .env.
- For documents with docType "INVOICE", extract: invoiceNumber, invoiceDate (ISO yyyy-mm-dd), sellerName, buyerName, lcNumber, currency, totalAmount (number), totalQuantity (number), items (array of { description, quantity, unitPrice, amount }).
- Validate with code before storing into Document.extractedData: all fields present, amounts and quantities are numbers, and items amounts sum to totalAmount (allow 0.01 rounding). If validation fails, store nothing and record the reason in the log.
- Run extraction automatically on upload, like the LC parser.
- Unit tests must NOT call the real API: mock the AI client with a recorded fixture response for samples/set-a/commercial-invoice.txt and assert the stored object matches the known values (invoice HB-INV-2026-041, date 2026-11-24, total USD 48,000.00, quantity 10,000, 2 items).
- Then do ONE live run against the real API on the set A invoice and record the extracted values in the log. If the API key is not set, stop and ask the owner to add DEEPSEEK_API_KEY to apps/api/.env first.
Run the tests and show me the results.

## Block 5 — Packing list, bill of lading, insurance extraction

Using the Block 4 AiExtractionService pattern, add extractors for the remaining types, each stored into Document.extractedData on upload:
- PACKING_LIST: packingListNumber, date (ISO), invoiceNumber, lcNumber, totalQuantity (number), totalCartons (number), totalNetWeightKg (number), totalGrossWeightKg (number), vessel.
- BILL_OF_LADING: blNumber, shipper, consignee, notifyParty, vessel, voyage, portOfLoading, portOfDischarge, shippedOnBoardDate (ISO, or null if the document has no shipped-on-board date), totalCartons (number), totalGrossWeightKg (number), goodsDescription, freightPrepaid (boolean), cleanOnBoard (boolean — true only if the document states clean on board).
- INSURANCE: certificateNumber, policyNumber, issueDate (ISO), assured, currency, sumInsured (number), voyageFrom, voyageTo.
Weights like "1,250.00 KGS" become the number 1250. Dates like "24 November 2026" become "2026-11-24".
- Unit tests with mocked AI fixtures for the three set A / set C samples, asserting the known values (packing: 500 cartons, gross 1250, net 1100; B/L: shipped on board 2026-11-25, 500 cartons, gross 1250, freight prepaid true; insurance: certificate MI-CERT-2026-1187, issue date 2026-11-28, sum insured USD 53,350).
- Then ONE live run per document type on the samples and record the extracted values in the log.
Run the tests and show me the results.
