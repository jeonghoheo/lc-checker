# SESSION.md — Post-v1 work orders (written by the reviewer, executed by OpenCode)

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

## Done so far
- v1.0.0 complete and tagged (2026-11-13): extraction, 15-rule engine (scoring 12/12), AI second opinion, web flow, report download, README.
- v1.0.1 (Block 14): provider-neutral LLM config (LLM_API_KEY / LLM_BASE_URL / LLM_MODEL with DEEPSEEK_* fallback), .env.example with DeepSeek/OpenAI/OpenRouter/LiteLLM examples, README provider-neutral wording.
- Block 15 — English and Russian README versions (done 2026-11-13)
- Block 16 — UI in Korean, English, and Russian (done 2026-11-13); v1.1.0

## Block 15 — English and Russian README versions (done)

Documentation only in this block (UI languages come in Block 16).

- Create `README.en.md`: a full English version of the current README.md — same structure and facts (3-step flow, local setup, the 15-rule table with UCP 600 references, A/B/C scoring results, honest limits, and the provider-neutral LLM wording from Block 14). Translate faithfully; keep the honesty/limits wording precise, not softer. Do NOT yet change the "Korean UI only" limits line — Block 16 updates it in all three files.
- Create `README.ru.md`: the same content in Russian.
- Add a language line at the very top of all three files: `한국어 | [English](README.en.md) | [Русский](README.ru.md)` — in README.en.md link back to README.md as 한국어, and likewise in README.ru.md.
- No code changes in this block. Verify the three files render (headings/tables intact) and commit + push together.

## Block 16 — UI in Korean, English, and Russian (owner reversed the v1 Korean-only decision) (done)

In apps/web:
- Add a small dictionary file (e.g. src/i18n.ts) with `ko`, `en`, `ru` string tables and a language state (default Korean), persisted in localStorage. No i18n library.
- Add a language switcher at the top of the page: three buttons labeled 한국어 / English / Русский.
- Every user-visible string the web app renders must come from the dictionary: page title and section headings, upload labels, document type labels (신용장/상업송장/포장명세서/선하증권/보험증서/종류 미확인), the extracted-values toggle, the presentation-date label and its helper line, the check and report buttons, the summary line with counts, error messages, the PASS toggle label, the "AI 참고 의견" prefix, and the five AI verdict labels.
- Rule names in the three languages (use exactly these):
  - ko: 1 선적 마감일, 2 제시 기한 (21일), 3 신용장 만료일, 4 보험 날짜, 5 송장 금액 한도, 6 총중량 일치, 7 수량 일치, 8 상자 수 일치, 9 물품 설명 대응, 10 항구 일치, 11 수하인 일치, 12 통지처 일치, 13 요구 서류 구비, 14 본선적재 표기, 15 배서 (이번 버전 검사 제외)
  - en: 1 Latest shipment date, 2 Presentation period (21 days), 3 LC expiry date, 4 Insurance date, 5 Invoice amount limit, 6 Gross weight match, 7 Quantity match, 8 Carton count match, 9 Goods description correspondence, 10 Port match, 11 Consignee match, 12 Notify party match, 13 Required documents present, 14 On-board notation, 15 Endorsement (not checked in this version)
  - ru: 1 Крайняя дата отгрузки, 2 Срок представления (21 день), 3 Срок действия аккредитива, 4 Дата страхования, 5 Лимит суммы инвойса, 6 Совпадение веса брутто, 7 Совпадение количества, 8 Совпадение числа мест, 9 Соответствие описания товара, 10 Совпадение портов, 11 Совпадение грузополучателя, 12 Совпадение уведомляемой стороны, 13 Наличие требуемых документов, 14 Отметка о погрузке на борт, 15 Индоссамент (не проверяется в этой версии)
- AI verdict labels: en — corresponds "Looks like the same goods", discrepancy "Actually different", likely_typo "Looks like a typo", different "Looks like a different company", unsure "Unclear". ru — corresponds "Похоже на тот же товар", discrepancy "Действительно различается", likely_typo "Похоже на опечатку", different "Похоже на другую компанию", unsure "Неясно". Prefix: en "AI note:", ru "Примечание ИИ:".
- Known limits of this block (record them in the log, do not hide them): the check-result messages and skip reasons stored by the API stay Korean in this version, and the downloadable report stays Korean. Only the web UI chrome, rule names, and verdict labels are translated.
- Update the limits line about UI language in all three READMEs to match the new state: UI is available in Korean, English, and Russian; server-stored result messages and the report are Korean only for now.
- Verify: `npm run build` and `npm run lint` pass; then a manual run with the UI switched to English — upload the set B files, run the check, and record in the log the English summary line and one FAIL row's rule name + AI note label as displayed. Repeat the summary-line check in Russian.
- Create git tag `v1.1.0` on the final commit and push it.
