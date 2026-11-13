# SESSION.md — Session 6 work orders (written by the reviewer, executed by OpenCode)

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
- Sessions 3-4 complete: extraction (5 document types) and the 15-rule engine. Scoring: planted errors 12 / 12, zero false positives.
- Session 5 complete: AI second opinion (aiReview) stored on FAIL results of rules 9, 11, 12. Live spot checks: set B rule 9 -> "discrepancy"; one-letter company-name typo -> "likely_typo".
- Block 10 — full web flow (done 2026-11-13)

## Design rules for all screens (owner's standing rules)
- Korean UI. Plain, short sentences. No abbreviation without spelling it out once.
- Buttons say the action as a verb ("검사 실행", "보고서 받기").
- Progress and results use concrete numbers ("불일치 6개" not "몇 개 문제").
- Keep it one simple page flow; no new libraries for styling — plain CSS in the existing style file.

## Block 10 — Wire the full flow into the web page (done)

In apps/web, extend the existing upload page into the full flow on one page, in this order:
1. 서류 올리기 (existing upload, keep as is).
2. 올린 서류 목록: each document shows its detected type in Korean (신용장 / 상업송장 / 포장명세서 / 선하증권 / 보험증서 / 종류 미확인) and a "뽑은 값 보기" toggle that renders its extractedData as simple key-value rows.
3. 제시일 입력: a date input labeled "은행에 서류를 내는 날짜" with one helper line: "이 날짜가 있어야 제시 기한 검사가 돌아갑니다." Save via the presentation-date endpoint.
4. "검사 실행" button that calls POST /document-sets/:id/check and then shows the result summary line: "검사 완료 — 통과 X개 · 불일치 Y개 · 검사 못함 Z개" (counts from the returned results).
- Handle errors plainly: if the API call fails, show "검사에 실패했습니다. 서버가 켜져 있는지 확인해 주세요." style messages, never raw error JSON.
- Verify: `npm run build` in apps/web passes, and record a manual run in the log (upload the four set B files through the page, set presentation date 2026-12-25, run the check, and write down the summary counts the page showed — expected: 통과 7 · 불일치 6 · 검사 못함 2).

## Block 11 — Results view (what does not match, first)

Below the summary line from Block 10, render the check results:
- Order: 불일치(FAIL) first, then 검사 못함(SKIPPED), then 통과(PASS) as a collapsed list (a "통과한 검사 보기" toggle).
- Each FAIL row shows: the rule's plain Korean name (mapping below), the two compared values side by side with labels (left: "신용장·기준 값", right: "서류 값" — use the labels stored in the result detail when present), the result message in one short line, and, when detail.aiReview exists, a small note box: "AI 참고 의견: " + verdict in Korean (corresponds -> "같은 물품으로 보임", discrepancy -> "실제로 다름", likely_typo -> "오타로 보임", different -> "다른 회사로 보임", unsure -> "판단 보류") + the reason sentence.
- Each SKIPPED row shows the rule name and the skip reason in plain words.
- Rule name mapping (Korean): 1 선적 마감일, 2 제시 기한 (21일), 3 신용장 만료일, 4 보험 날짜, 5 송장 금액 한도, 6 총중량 일치, 7 수량 일치, 8 상자 수 일치, 9 물품 설명 대응, 10 항구 일치, 11 수하인 일치, 12 통지처 일치, 13 요구 서류 구비, 14 본선적재 표기, 15 배서 (이번 버전 검사 제외).
- Verify: `npm run build` passes, plus the same manual set B run as Block 10 — record in the log that the 6 FAIL rows appear first with both values shown, and that the rule 9 row shows the AI note.
