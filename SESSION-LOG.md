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
