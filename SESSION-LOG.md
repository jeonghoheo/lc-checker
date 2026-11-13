# SESSION-LOG.md — 블록별 실행 결과 기록
망곰이가 GitHub에서 이 파일을 읽고 진행을 확인한다. 블록이 끝날 때마다 맨 아래에 append.

## 블록 1 — 파일 글자 읽어오기 (2026-11-13)
- 한 일: GET /document-sets/:id/documents/:docId/text 추가. PDF는 pdf-parse로 글자 층만, 텍스트 파일은 UTF-8로 읽음. 빈 결과·실패는 400.
- 테스트: 통과 4 / 전체 4. lint 오류 없음. PDF 추출은 수동으로도 확인 (HNBC-260781-KR 발견).
- 특이사항: 없음.

## 블록 2 — 서류 종류 알아맞히기 (2026-11-13)
- 한 일: 추출 텍스트로 서류 종류 감지 (LC, INVOICE, PACKING_LIST, BILL_OF_LADING, INSURANCE, 그 외 null). 업로드 후 자동 감지해 Document.docType에 저장. GET document-set 응답에 docType 포함. 샘플 5종 단위 테스트 추가.
- 테스트: 통과 6 / 전체 6 (vitest 단위), 통과 4 / 전체 4 (e2e). lint 오류 없음.
- 특이사항: 텍스트 추출에 실패하면 업로드는 막지 않고 docType만 null로 둠. LC·INVOICE 샘플을 실제 업로드해 GET 응답의 docType도 수동 확인.

## Block 3 — Extract values from the letter of credit (2026-11-13)
- Done: Added `LcParserService` and a nullable `Document.extractedData` JSONB column via Prisma migration. Documents detected as `LC` are parsed on upload and the structured values are stored; GET document-set returns `extractedData`. Added unit tests covering all requested LC fields for `samples/set-a/lc-mt700.txt`.
- Tests: passed 7 / total 7 (vitest unit), passed 4 / total 4 (e2e). Lint has no errors. Manual upload confirmed the LC response includes both `docType` and `extractedData`.
- Notes: The Block 3 extra check could not run because `samples/set-b/lc-mt700.txt` is missing. Exact failure:
  ```
  Error: ENOENT: no such file or directory, open '../../samples/set-b/lc-mt700.txt'
  ```
  Stopped as required; no unverified fix or set B values were invented.
- Extra check (corrected): ran the same parser on `samples/set-c/lc-mt700.txt`. The extracted `documentsRequired` was:
  ```
  1. SIGNED COMMERCIAL INVOICE IN 3 COPIES INDICATING L/C NO. HNBC-260781-KR.
  2. PACKING LIST IN 3 COPIES INDICATING GROSS AND NET WEIGHTS AND NUMBER OF CARTONS.
  3. FULL SET (3/3) OF CLEAN ON BOARD OCEAN BILLS OF LADING CONSIGNED TO
     NORDLYS COSMETICS GMBH, NOTIFY PARTY NORDLYS COSMETICS GMBH,
     SPEICHERSTADT 12, 20457 HAMBURG, GERMANY, MARKED FREIGHT PREPAID AND
     EVIDENCING SHIPMENT FROM BUSAN PORT, REPUBLIC OF KOREA TO HAMBURG
     PORT, GERMANY.
  4. INSURANCE CERTIFICATE IN 2 COPIES, COVERING INSTITUTE CARGO CLAUSES (A)
     FOR 110 PERCENT OF THE INVOICE VALUE AND EVIDENCING THAT INSURANCE
     COVER IS EFFECTIVE FROM A DATE NOT LATER THAN THE DATE OF SHIPMENT.
  5. CERTIFICATE OF ORIGIN IN 1 COPY ISSUED BY THE KOREA CHAMBER OF
     COMMERCE AND INDUSTRY.
  ```
  `contains "CERTIFICATE OF ORIGIN": true`. The parser reads the actual set C file, not set A's shorter list, so it is not hardcoded. This supersedes the earlier set B note per the corrected work order.

## Block 4 — AI extraction base + commercial invoice (2026-11-13)
- Done: Added `AiExtractionService` for DeepSeek's OpenAI-compatible JSON endpoint, `.env.example`, and `InvoiceExtractionService` with code-side validation. INVOICE documents are extracted automatically on upload; extraction or validation failures keep the upload with `extractedData = null`. Added mocked unit tests plus e2e tests for storing mocked invoice data and keeping an upload when extraction fails.
- Tests: passed 9 / total 9 (vitest unit), passed 6 / total 6 (e2e). Lint has no errors.
- Notes: The required live DeepSeek run is blocked because `DEEPSEEK_API_KEY` is missing or empty in `apps/api/.env`. Stopped as required. Add `DEEPSEEK_API_KEY` (and optionally `DEEPSEEK_MODEL`) to `apps/api/.env` before the live run.
- Live run (continued): after the key was added, the API was restarted and `samples/set-a/commercial-invoice.txt` was uploaded once. The upload returned 201 and GET document-set returned `docType: "INVOICE"` with:
  ```json
  {
    "invoiceNumber": "HB-INV-2026-041",
    "invoiceDate": "2026-11-24",
    "sellerName": "Hanbyeol Packaging Co., Ltd.",
    "buyerName": "Nordlys Cosmetics GmbH",
    "lcNumber": "HNBC-260781-KR",
    "currency": "USD",
    "totalAmount": 48000,
    "totalQuantity": 10000,
    "items": [
      {
        "description": "Plastic cosmetic jars 50ml",
        "quantity": 6000,
        "unitPrice": 4.2,
        "amount": 25200
      },
      {
        "description": "Airless pump bottles 30ml",
        "quantity": 4000,
        "unitPrice": 5.7,
        "amount": 22800
      }
    ]
  }
  ```
  Validation passed and the values match the sample invoice. This supersedes the blocked note above.

## Block 5 — Packing list, bill of lading, insurance extraction (2026-11-13)
- Done: Added `PackingListExtractionService`, `BillOfLadingExtractionService`, and `InsuranceExtractionService` using the Block 4 AI pattern plus shared code-side validation. Each type is extracted automatically on upload and stored in `Document.extractedData`. Unit tests use mocked AI fixtures for the set A packing list, set A bill of lading, and set C insurance certificate.
- Tests: passed 13 / total 13 (vitest unit), passed 6 / total 6 (e2e). Lint has no errors.
- Notes: One live DeepSeek run per document type succeeded on the samples. The extracted values were:
  ```json
  {
    "docType": "PACKING_LIST",
    "extractedData": {
      "packingListNumber": "HB-PL-2026-041",
      "date": "2026-11-24",
      "invoiceNumber": "HB-INV-2026-041",
      "lcNumber": "HNBC-260781-KR",
      "totalQuantity": 10000,
      "totalCartons": 500,
      "totalNetWeightKg": 1100,
      "totalGrossWeightKg": 1250,
      "vessel": "MV NORTHERN EXPRESS V.064N"
    }
  }
  ```
  ```json
  {
    "docType": "BILL_OF_LADING",
    "extractedData": {
      "blNumber": "HB-BL-2026-041",
      "shipper": "HANBYEOL PACKAGING CO., LTD., 123 PACKAGING-RO, ASAN-SI, CHUNGCHEONGNAM-DO, REPUBLIC OF KOREA",
      "consignee": "NORDLYS COSMETICS GMBH, SPEICHERSTADT 12, 20457 HAMBURG, GERMANY",
      "notifyParty": "NORDLYS COSMETICS GMBH, SPEICHERSTADT 12, 20457 HAMBURG, GERMANY",
      "vessel": "MV NORTHERN EXPRESS",
      "voyage": "V.064N",
      "portOfLoading": "BUSAN PORT, REPUBLIC OF KOREA",
      "portOfDischarge": "HAMBURG PORT, GERMANY",
      "shippedOnBoardDate": "2026-11-25",
      "totalCartons": 500,
      "totalGrossWeightKg": 1250,
      "goodsDescription": "PLASTIC COSMETIC JARS 50ML AND AIRLESS PUMP BOTTLES 30ML",
      "freightPrepaid": true,
      "cleanOnBoard": false
    }
  }
  ```
  ```json
  {
    "docType": "INSURANCE",
    "extractedData": {
      "certificateNumber": "MI-CERT-2026-1187",
      "policyNumber": "MI-POL-2026-0092",
      "issueDate": "2026-11-28",
      "assured": "Hanbyeol Packaging Co., Ltd.",
      "currency": "USD",
      "sumInsured": 53350,
      "voyageFrom": "Busan Port, Republic of Korea",
      "voyageTo": "Hamburg Port, Germany"
    }
  }
  ```
  These match the known sample values: packing 500 cartons / gross 1250 / net 1100, B/L shipped on board 2026-11-25 / 500 cartons / gross 1250 / freight prepaid true, and insurance certificate MI-CERT-2026-1187 / issue date 2026-11-28 / sum insured USD 53,350.

## Block 6 — Check plumbing + rules 1-8 (dates and numbers) (2026-11-13)
- Done: Added nullable `presentationDate` (DATE) to `DocumentSet`, `CheckRun` and `CheckResult` tables, `PATCH /document-sets/:id/presentation-date`, and `POST /document-sets/:id/check`. A check run stores 15 results. Added the B/L `issueDate` extraction field and pure rule functions for rules 1-8; rules 4 and 9-15 return SKIPPED "not implemented yet" as specified.
- Tests: passed 29 / total 29 (vitest unit), passed 6 / total 6 (e2e). Lint has no errors. Manual endpoint run stored 15 results: rules 1, 2, 3, 5, 6, 7, 8 PASS and rules 4, 9-15 SKIPPED for clean set A with presentationDate `2026-12-10`.
- Notes: No failures. The check response includes the run plus ordered results; FAIL details store a message and both compared values.

## Block 7 — Rules 9-15 (cross-checks and presence) (2026-11-13)
- Done: Implemented rule 4 (insurance issue date with B/L issue-date fallback) and rules 9-15: deterministic goods-word check, port checks, consignee/notify name comparison, required-document presence, on-board notation, and the v1 endorsement skip. Added `uploadedDocTypes` to the check context so rule 13 uses actual uploaded document types.
- Tests: passed 44 / total 44 (vitest unit), passed 6 / total 6 (e2e). Lint has no errors. Each implemented rule has pass and fail unit cases from the sample values.
- Notes: Rule 9 checks significant product words before any "AS PER" or "TRADE TERMS" boilerplate and ignores numeric-only tokens, preventing false failures from proforma/trade-term text. No failures.

## Block 8 — Scoring run against the planted errors (session 4 finale) (2026-11-13)
- Done: Added `test/scoring.e2e-spec.ts`. It builds sets A, B, and C from fixture `extractedData` (the LC fixtures come from the sample LC files; the other values match the sample documents) and runs `POST /document-sets/:id/check`. The test does not call the live AI API.
- Tests: passed 44 / total 44 (vitest unit), passed 9 / total 9 (e2e). Lint has no errors.
- Scorecard:

  | Set | Expected FAIL rules | Actual FAIL rules | Planted errors caught |
  | --- | --- | --- | --- |
  | A | none | none | 0 / 0 |
  | B | 1, 2, 6, 8, 9, 12 | 1, 2, 6, 8, 9, 12 | 6 / 6 |
  | C | 4, 5, 7, 10, 13, 14 | 4, 5, 7, 10, 13, 14 | 6 / 6 |

  Planted errors caught: 12 / 12.
- Notes: The trap items produced no extra FAIL results (set B's reordered shipper address and set C's general-terms packing description). Session 4 is complete.

## Block 9 — AI second opinion on borderline failures (session 5) (2026-11-13)
- Done: Added a reusable `AiExtractionService.extractJson`, an `AiReviewService` that asks DeepSeek for a rule-specific verdict with plain-language UCP 600 guidance, and post-check review for FAIL results of rules 9, 11, and 12. The advisory result is stored as `aiReview` inside `CheckResult.detail`; if the AI call fails, the review is skipped and the check still completes. Added unit tests with a mocked AI client and kept the scoring e2e offline with a stub review service.
- Tests: passed 47 / total 47 (vitest unit), passed 9 / total 9 (e2e). Lint has no errors.
- Live spot checks:
  1. Set B rule 9 (invoice items missing "Airless"): verdict `discrepancy`, reason: "The invoice omits the LC goods word \"AIRLESS\" from the pump bottles description, so the invoice description does not correspond to the LC description under Art. 18(c)."
  2. Synthetic rule 11 typo (consignee `NORDLYS COSMETIC GMBH` missing the "S" in COSMETICS vs applicant `NORDLYS COSMETICS GMBH`): verdict `likely_typo`, reason: "The consignee name differs from the LC applicant only by a missing \"S\" in \"COSMETICS\", with the address otherwise identical, indicating a likely typo."
- Notes: The session 4 scoring e2e test still asserts the same exact FAIL statuses and passes. The SESSION.md wording listed identical names for the rule 11 spot check, so a one-letter synthetic typo was used to create an actual rule 11 FAIL. Session 5 is complete.

## Block 10 — Wire the full flow into the web page (2026-11-13)
- Done: Extended `apps/web/src/App.tsx` into the one-page flow: upload, document list with Korean type labels and a "뽑은 값 보기" toggle, presentation-date save, and "검사 실행" with the summary line. Added plain CSS for the document list, extracted values, date field, and summary. New API failures show friendly Korean messages instead of raw JSON.
- Tests: `npm run build` passed in `apps/web`; `npm run lint` passed.
- Manual run: uploaded the four set B files through the page, saved presentation date `2026-12-25`, and ran the check. The page showed "검사 완료 — 통과 7개 · 불일치 6개 · 검사 못함 2개", matching the expected counts. The document list showed 신용장 / 상업송장 / 포장명세서 / 선하증권, and the extracted-value toggles rendered key-value rows.
- Notes: No new styling library was added. No failures.

## Block 11 — Results view (what does not match, first) (2026-11-13)
- Done: Added the results view below the summary. FAIL rows come first with Korean rule names, the two compared values side by side under "신용장·기준 값" / "서류 값", the stored result message, and an AI advisory note when present. SKIPPED rows show the stored reason, and PASS rows are collapsed behind the "통과한 검사 보기" toggle.
- Tests: `npm run build` passed in `apps/web`; `npm run lint` passed.
- Manual run: the same set B flow showed "검사 완료 — 통과 7개 · 불일치 6개 · 검사 못함 2개". The page showed 6 FAIL rows first in rule order 1, 2, 6, 8, 9, 12 with both values visible, then 2 SKIPPED rows. Rule 9 showed the AI note: "AI 참고 의견: 실제로 다름 — The invoice omits the LC word \"AIRLESS\" from the pump bottles description, so the goods description does not correspond to the LC." Expanding the PASS toggle showed 7 passing checks.
- Notes: No failures. Session 6 is complete.

## Block 12 — Downloadable discrepancy report (2026-11-13)
- Done: Added `ReportService` and `GET /document-sets/:id/report`, returning the latest check run as a self-contained printable Korean HTML attachment named `lc-report-<setId>.html`. If no check run exists, it returns 400 with a plain message. The report includes the LC number, presentation date, summary counts, FAIL rows with both compared values and messages plus AI notes, SKIPPED reasons, PASS rule names, and the exact honesty notice as the last line. Added a "보고서 받기" button next to "검사 실행" in the web page, disabled until a check has run.
- Tests: passed 47 / total 47 (vitest unit), passed 10 / total 10 (e2e). `npm run build` and `npm run lint` passed in `apps/web`. The new e2e test reuses the set B fixtures and asserts the rule 1 values and honesty notice in the downloaded HTML.
- Notes: No failures.

## Block 13 — README and v1 wrap-up (final block) (2026-11-13)
- Done: Rewrote `README.md` with a short English summary, Korean 3-step explanation (서류 올리기 -> 값 뽑기 -> 규칙 대조), screenshot placeholders, local run instructions including `apps/api/.env` with `DEEPSEEK_API_KEY`, the 15-rule table with UCP 600 references, the A/B/C sample score, and the honest limits section. Updated the web build after the final UI work.
- Tests: passed 47 / total 47 (vitest unit), passed 10 / total 10 (e2e), `npm run build` and `npm run lint` passed in `apps/web`.
- Full local verification: stopped the API/web processes, ran `docker compose down` then `docker compose up -d`, started the API and web app, ran all suites above, then ran one manual browser flow with the four set A files and presentation date `2026-12-10`. The page ended with "검사 완료 — 통과 13개 · 불일치 0개 · 검사 못함 2개" and 0 FAIL rows. The report button also downloaded `lc-report-<setId>.html`.
- Notes: v1 is complete. Git tag `v1.0.0` is created on the final commit. No failures.

## Block 14 — Any OpenAI-compatible LLM (2026-11-13)
- Done: Switched the LLM config path to generic `LLM_API_KEY`, `LLM_BASE_URL` (default `https://api.deepseek.com`), and `LLM_MODEL` (default `deepseek-chat`), with fallback to `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL`. The chat-completions URL is built from the base URL, so OpenAI, OpenRouter, Qwen-compatible endpoints, and local LiteLLM proxies work. Updated `.env.example` and README wording. Added unit tests for the custom base URL and the legacy fallback.
- Tests: passed 49 / total 49 (vitest unit), passed 10 / total 10 (e2e). Lint has no errors.
- Live check: ran one invoice extraction with the real API through the new config path. `LLM_*` was unset, so the key came from `DEEPSEEK_API_KEY`, the base URL came from the default `https://api.deepseek.com`, and the model came from the default `deepseek-chat`. The set A invoice extracted as `HB-INV-2026-041`, USD `48000`.
- Notes: v1.0.1 tag is created on the final commit. No failures.
