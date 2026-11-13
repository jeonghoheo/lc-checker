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
- LICENSE (MIT) file is in the repo folder, waiting for the owner's commit line together with repository topics.
- Block 14 — provider-neutral LLM config (done 2026-11-13)

## Block 14 — Any OpenAI-compatible LLM, not just DeepSeek (done)

Owner's point: the .env.example and README read as if only DeepSeek works. The API is OpenAI-compatible, so make that real in code and honest in words.

In apps/api:
- Introduce generic env names: `LLM_API_KEY`, `LLM_BASE_URL` (default `https://api.deepseek.com`), `LLM_MODEL` (default `deepseek-chat`). AiExtractionService and AiReviewService must build their request URL from LLM_BASE_URL and read key/model from the LLM_* names.
- Backward compatibility: if an LLM_* variable is unset, fall back to the existing DEEPSEEK_API_KEY / DEEPSEEK_MODEL so the owner's current .env keeps working untouched.
- Update .env.example: list the LLM_* variables with comments saying any OpenAI-compatible endpoint works, with examples — DeepSeek (default, https://api.deepseek.com), OpenAI (https://api.openai.com/v1), OpenRouter (https://openrouter.ai/api/v1), a local LiteLLM proxy (http://localhost:4000/v1).
- Tests: all existing mocked tests must pass unchanged; add one unit test proving the request URL is built from LLM_BASE_URL (e.g. a custom base URL appears in the mocked client's call).
- Live check: run ONE invoice extraction with the real API through the new config path (the owner's existing key via the DEEPSEEK_* fallback is fine) and record in the log which env path supplied the key/base URL and the extracted invoice number/total.
- README: change the setup and "what it does" wording from DeepSeek-only to "an OpenAI-compatible LLM API (DeepSeek by default; OpenAI, OpenRouter, Qwen-compatible endpoints, or a local LiteLLM proxy also work)". Add one honest line to the limits section: "Extraction quality is validated with DeepSeek only; other models are untested."
- Create git tag `v1.0.1` on the final commit and push it.
Run the tests and show me the results.

## Block 15 — English and Russian README versions

Documentation only; the app UI stays Korean in v1 (owner's decision — UI languages are a v2 topic).

- Create `README.en.md`: a full English version of the current README.md — same structure and facts (3-step flow, local setup, the 15-rule table with UCP 600 references, A/B/C scoring results, honest limits). Translate faithfully; keep the honesty/limits wording precise, not softer. After Block 14, the LLM wording must be the new provider-neutral wording in all versions.
- Create `README.ru.md`: the same content in Russian.
- Add a language line at the very top of all three files: `한국어 | [English](README.en.md) | [Русский](README.ru.md)` — in README.en.md link back to README.md as 한국어, and likewise in README.ru.md.
- No code changes in this block. Verify the three files render (headings/tables intact) and commit + push together.
