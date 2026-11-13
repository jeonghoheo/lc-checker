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
