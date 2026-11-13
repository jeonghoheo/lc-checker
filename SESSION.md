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
- Block 17 — light card UI redesign + custom upload area (done 2026-11-13); v1.2.0

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

## Block 17 — UI redesign: light card layout + custom upload area (owner-approved direction) (done)

Visual redesign ONLY. No behavior changes: same API calls, same state flow, same dictionary keys (plus the new ones listed below). Plain CSS in the existing stylesheet file(s) of apps/web. No new npm dependencies, no CSS framework, no component library.

Design targets (approved mock):
- Light "document" theme. Page background #eef0f3. Content column centered, max-width 760px, comfortable side padding.
- Each step is a white card: background #ffffff, 1px solid #dde1e7 border, border-radius 12px, padding 16–20px, 12px gap between cards.
- Accent color #2456c8 — used ONLY for: the primary button, step numbers, the selected language pill, links. Status colors: pass green #1e7a34 on #e6f4ea; fail red #c62f3b on #fdecec; skipped gray #5a6472 on #eceff3. Color means status, never decoration.
- Header row: page title (20–22px, bold) on the left, language switcher on the right as pill buttons — selected = filled accent with white text; unselected = white background, 1px border #d5d9df, gray text.
- Section headings inside cards: 15–16px bold, prefixed with a step label in the accent color, format "{step} · {heading}". New dictionary keys step1/step2/step3 — ko: "1단계" / "2단계" / "3단계"; en: "Step 1" / "Step 2" / "Step 3"; ru: "Шаг 1" / "Шаг 2" / "Шаг 3".
- Buttons: primary (run check, create set) = filled accent, white text, border-radius 9px, padding 10px 22px. Secondary (report download, save date, toggles) = white background, 1px solid #c9d1dc border, same radius. Disabled state visibly muted.

Custom upload area (this fixes the owner's complaint that the file picker stayed Korean in EN/RU UI — the browser's native file input renders in the browser's own language and cannot be translated):
- Hide the native `<input type="file">` visually (keep it in the DOM and wired exactly as now). Build a custom drop zone: dashed 1.5px border #b9c2cf, background #f7f9fc, border-radius 10px, centered text. Clicking the zone opens the file picker (label or programmatic click). Support drag-over highlight (border switches to accent) and drop, reusing the same upload handler.
- All drop-zone text comes from the dictionary. New keys: dropHint — ko "파일을 여기로 끌어다 놓거나 눌러서 선택하세요", en "Drag files here, or click to choose", ru "Перетащите файлы сюда или нажмите, чтобы выбрать"; dropSub — ko "PDF와 텍스트 파일만 됩니다", en "PDF and text files only", ru "Только файлы PDF и текстовые файлы".
- The browser-native file input must NOT be visible anywhere in the UI when you are done.
- Uploaded document rows: light rows (background #f7f9fc, 1px solid #e4e8ee, radius 8px), filename on the left, document-type chip on the right (small pill, 11–12px, semibold). Chip colors per type: 신용장/LC = #e3ebfd text #2456c8; 상업송장/invoice = #e6f4ea text #1e7a34; 선하증권/bill of lading = #fdf0e0 text #9a6206; 포장명세서/packing list = #e0f2f1 text #00695c; 보험증서/insurance = #f3e5f5 text #6a1b9a; 종류 미확인/unknown = #eceff3 text #5a6472.

Presentation date: keep the native date input (its inner placeholder follows the browser locale — a known limit; record it in the log, do not claim it is translated). Style its border/radius to match the other controls, and keep the translated label + helper line from Block 16.

Results area:
- Summary line becomes three pill chips with the counts, using the status colors above (pass green, discrepancy red, skipped gray). The counts and wording stay exactly what the current summary strings produce — only the presentation changes.
- Each discrepancy (FAIL) result is a card: left border 4px solid #e05260, background #fff7f7, radius 8px. Rule name as the card title (bold, dark red #a12633). Below it, the two compared values side by side in two white boxes (1px solid #ecd3d5, radius 8px), each with a small gray caption — the captions reuse the existing dictionary labels for the LC value and the document value; if no such keys exist, add: valueLc — ko "신용장 값", en "Letter of credit", ru "Аккредитив"; valueDoc — ko "서류 값", en "Document", ru "Документ". The result message goes under the boxes in plain text. The AI note, when present, sits in a subtle inner box (white background, 1px solid #e4e8ee) under the message.
- On narrow screens the two value boxes stack vertically (flex-wrap is fine).
- Passed results stay behind the existing collapsed toggle, rendered as quiet rows (no red/green card treatment — a small green status dot or the word PASS in green is enough). Skipped results render as quiet gray rows.
- The extracted-values view keeps its content; present it as a simple two-column definition list inside its card.

Verify:
- `npm run build` and `npm run lint` pass in apps/web.
- Manual run, set B, Korean UI: summary counts must still be pass 7 · discrepancy 6 · skipped 2 (functional regression check — the redesign must not change results).
- Switch to English: confirm the drop-zone text is in English and no browser-native file input is visible; record the English dropHint line in the log. Switch to Russian: confirm the drop-zone text is in Russian; record it in the log.
- Record in the log, honestly: the date input's inner placeholder still follows the browser locale (not translated by the page).
- Create git tag `v1.2.0` on the final commit and push it (with the tag).
