# SESSION.md — Session 7 work orders (final session of v1)

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
- Sessions 3-5 complete: extraction (5 types), 15-rule engine (scoring 12/12, zero false positives), AI second opinion on rules 9/11/12.
- Session 6 complete: full web flow — upload, extracted values, presentation date, check run, results view (FAIL first, both values side by side, AI note shown). Manual set B run on the page matched the expected counts and rows.
- Block 12 — downloadable discrepancy report (done 2026-11-13)
- Block 13 — README and v1 wrap-up (done 2026-11-13); v1 complete.

## Block 12 — Downloadable discrepancy report (done)

In apps/api + apps/web:
- Add `GET /document-sets/:id/report` that returns the latest check run of the set as one self-contained HTML file download (Content-Disposition attachment, filename like `lc-report-<setId>.html`). If the set has no check run yet, return 400 with a plain message.
- Report content (Korean, printable from a browser): title "신용장 서류 미리 점검 보고서", the LC number and presentation date, the summary counts (통과/불일치/검사 못함), then a table of FAIL rows (rule name in Korean — same mapping as the web results view, both compared values, message, AI note when present), SKIPPED rows with reasons, and PASS rule names in one line each.
- The last line of the report must be this honesty notice, exactly: "이 보고서는 은행에 서류를 내기 전에 미리 점검한 결과입니다. 은행의 최종 판정을 보장하지 않습니다."
- In apps/web, add a "보고서 받기" button next to "검사 실행" that downloads the report for the current set (disabled until a check has run).
- Tests: one e2e test that seeds a set with a known FAIL (reuse the set B fixtures), runs the check, downloads the report, and asserts the HTML contains the rule 1 FAIL values and the honesty notice. `npm run build` in apps/web must pass.

## Block 13 — README and v1 wrap-up (final block) (done)

- Rewrite the repository README.md (Korean main text, short English summary at the top): what the tool does in 3 plain steps (서류 올리기 -> 값 뽑기 -> 규칙 대조), a screenshot placeholder section (leave the headings, no fake images), how to run locally (docker compose, api, web, .env with DEEPSEEK_API_KEY), the 15 rules table with their UCP 600 basis, the scoring result (sample sets A/B/C, planted errors 12/12, traps with zero false positives), and an honest limits section listing: text-layer PDF/text files only (no OCR for scanned documents), the 15 rules are a subset of UCP 600 practice (ISBP not included), rule 15 (endorsement) is not checked in v1, a certificate of origin cannot be uploaded in v1, Korean UI only (English UI planned for v2), and the tool is a pre-check that does not guarantee a bank's decision.
- Full local verification, recorded in the log: from a clean state, `docker compose up -d`, start api and web, run the whole test suites (api unit + e2e, web build + lint), then one manual browser flow with set A files ending in "불일치 0개".
- Create git tag `v1.0.0` on the final commit and push the tag.
- Update AGENTS.md Current status: v1 complete. Push everything together.
