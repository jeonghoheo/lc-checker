# SESSION.md — Session 5 work orders (written by the reviewer, executed by OpenCode)

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
- Session 3 complete (2026-11-13): extraction for all 5 document types, live-verified.
- Session 4 complete (2026-11-13): rule engine, all 15 rules. Scoring run: planted errors caught 12 / 12, zero false positives on the trap items (unit 44, e2e 9).
- Block 9 — AI second opinion on borderline failures (done 2026-11-13); session 5 complete.

## Block 9 — AI second opinion on borderline failures (session 5) (done)

Idea: three rules fail on text differences that a word comparison cannot judge — rule 9 (goods description wording), rule 11 (consignee name), rule 12 (notify party name). A one-letter typo is not the same problem as a different company or a missing product word. Add an AI second opinion to those FAILs. The deterministic FAIL always stands; the AI only adds an advisory note that the review screen will show later.

In apps/api:
- Add an AiReviewService using the existing DeepSeek setup (same env vars). Input: the rule number, the two compared values, and the rule's FAIL detail. Output JSON: { "verdict": ..., "reason": "one short sentence" }.
  - For rule 9, verdict is one of: "corresponds" (different wording, same goods), "discrepancy" (goods description really differs), "unsure".
  - For rules 11-12, verdict is one of: "likely_typo" (same company, small typing difference), "different" (a different company), "unsure".
  - The prompt must include the UCP 600 idea in plain words: invoice description must correspond to the LC description (Art. 18(c)); data must not conflict (Art. 14(d)) — exact sameness is not required.
- In the check flow (POST /document-sets/:id/check), after the deterministic results are stored, run the AI review for FAIL results of rules 9, 11, 12 only, and store the result inside that CheckResult's detail as `aiReview`. If DEEPSEEK_API_KEY is missing or the call fails, skip the review and leave aiReview absent — the check must still complete normally.
- Unit tests with a mocked AI client (no live calls): (a) rule 9 FAIL with a missing product word returns verdict "discrepancy" in the stored detail; (b) rule 11 FAIL with consignee "NORDLYS COSMETICS GMBH" vs LC applicant "NORDLYS COSMETICS GMBH" returns verdict "likely_typo"; (c) with the AI client failing, the check still completes and aiReview is absent.
- The session 4 scoring e2e test must still pass unchanged (statuses are not affected by aiReview).
- Live spot checks (real API), recorded in the log with the AI's verdict and reason:
  1. Set B's rule 9 case: LC description vs the set B invoice items (missing "Airless"). Expected verdict: "discrepancy".
  2. A synthetic typo case for rule 11: consignee "NORDLYS COSMETICS GMBH" vs applicant "NORDLYS COSMETICS GMBH". Expected verdict: "likely_typo".
  If a live verdict differs from the expected one, record what actually came back — do not tune the test to hide it.
Run the tests and show me the results.
