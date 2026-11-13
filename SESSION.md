# SESSION.md — 세션 3 작업 지시 (망곰이가 작성, OpenCode가 실행)

## 작업 방식 (고정 규칙)
- 주인이 한국어로 "블록 N 실행해"라고 하면, 아래 블록 N만 실행한다. 한 번에 한 블록만.
- 블록이 끝나면 SESSION-LOG.md 맨 아래에 결과 요약을 append 한다. 형식:
  ## 블록 N — 제목 (날짜)
  - 한 일: ...
  - 테스트: 통과 X / 전체 Y (실패가 있으면 실패 내용 그대로)
  - 특이사항: ...
- 그 다음 코드 변경분과 SESSION-LOG.md를 함께 commit + push 한다.
- 실패하면 추측으로 고치지 말고, 실패 출력을 로그에 그대로 남기고 멈춘다.
- 세션의 마지막 블록이 끝나면 AGENTS.md의 Current status도 갱신하고 같이 push 한다.

## 블록 2 — 서류 종류 알아맞히기

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

## 블록 3 — 신용장에서 값 뽑기

In apps/api, add an LC parser for documents whose docType is "LC":
- Parse the MT700 text by its field tags and produce a structured object with: creditNumber (:20:), issueDate (:31C:), expiryDate and expiryPlace (:31D:), applicant (:50:), beneficiary (:59:), currency and amount (:32B:), tolerance (:39A:), portOfLoading (:44E:), portOfDischarge (:44F:), latestShipmentDate (:44C:), goodsDescription (:45A:), documentsRequired (:46A: as raw text), presentationDays (number parsed from :48:, e.g. 21).
- MT700 dates are YYMMDD: convert to ISO dates (26 -> 2026). Amount "USD48000,00" becomes currency "USD", amount 48000.00.
- Store the parsed object as JSON in a new nullable column on Document (extractedData) via a new Prisma migration, and return it in the GET document-set response.
- Add unit tests that parse samples/set-a/lc-mt700.txt and assert every field above against the known values.
Run the tests and show me the results.

## 블록 3 검수 추가 (하드코딩 탐지)
블록 3 테스트가 통과하면, 같은 파서를 samples/set-b/lc-mt700.txt에도 한 번 돌려서 뽑힌 값들을 로그에 남긴다. 세트 B 신용장은 값이 조금 다르므로, 세트 A 값이 그대로 나오면 하드코딩이다.
