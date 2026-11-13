[한국어](README.md) | English | [Русский](README.ru.md)

# LC Checker

**English summary:** LC Checker is a pre-check tool for exporters. It uploads an MT700 letter of credit and shipping documents, extracts the key values, and checks them against 15 deterministic rules before bank presentation. It does not guarantee the bank's final decision.

LC Checker is a tool for comparing a letter of credit (MT700) with shipping documents before presenting them to a bank.
It extracts values from the documents and uses 15 fixed rules to show discrepancies.
It does not replace the bank's final decision.

## What it does

1. **Upload documents** — Upload a letter of credit, commercial invoice, packing list, bill of lading, and insurance certificate.
2. **Extract values** — Read values from text files and the text layer of PDFs. The letter of credit has a fixed format and is parsed by code; the other documents are extracted with an OpenAI-compatible LLM API and validated again by code. The default provider is DeepSeek.
3. **Compare against rules** — Compare dates, amounts, quantities, weights, carton counts, ports, names, and document completeness with fixed rules. All comparisons run in plain code.

## Screens

### Document upload and extracted values

<!-- Screenshot placeholder: upload list and "extracted values" view -->

Screenshots go here.

### Check results

<!-- Screenshot placeholder: discrepancies / skipped / passed results -->

Screenshots go here.

## Run locally

### 1. Database

```bash
docker compose up -d
```

This starts the PostgreSQL 16 container `lc-postgres`.

### 2. API

```bash
cd apps/api
npm install
```

Create `apps/api/.env` and add the values below.

```dotenv
DATABASE_URL="postgresql://lcuser:lcpass@localhost:5432/lcchecker?schema=public"

# Any OpenAI-compatible API works. Default: DeepSeek.
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
```

The legacy `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` names still work as a fallback. OpenAI, OpenRouter, Qwen-compatible endpoints, and a local LiteLLM proxy also work. See `apps/api/.env.example` for example URLs.

Apply the database schema and start the API.

```bash
npx prisma migrate deploy
npm run start:dev
```

The API runs at `http://localhost:3000`. Check its status with `GET /health`.

### 3. Web app

```bash
cd apps/web
npm install
npm run dev
```

The web app runs at `http://localhost:5173`.

| Target | Address |
| --- | --- |
| PostgreSQL | localhost:5432 |
| API health check | http://localhost:3000/health |
| Web app | http://localhost:5173 |

## The 15 checking rules

| No. | Rule | What it checks | UCP 600 basis (reference) |
| --- | --- | --- | --- |
| 1 | Latest shipment date | The on-board date on the bill of lading must not be later than the LC's latest shipment date. | Art. 20(a)(ii), LC :44C |
| 2 | Presentation period (21 days) | Presentation must be made within 21 days of the on-board date. | Art. 14(c) |
| 3 | LC expiry date | The presentation date must not be later than the LC expiry date. | Art. 6(d)(i) |
| 4 | Insurance date | The insurance issue date must not be later than the shipment date. | Art. 28(e) |
| 5 | Invoice amount limit | The invoice amount must not exceed the LC amount and its tolerance, and the currency must match. | Art. 18(b), LC :32B/:39A |
| 6 | Gross weight match | The total gross weight on the packing list and bill of lading must match. | Art. 14(d) |
| 7 | Quantity match | The total quantity on the commercial invoice and packing list must match. | Art. 14(d) |
| 8 | Carton count match | The carton count on the packing list and bill of lading must match. | Art. 14(d) |
| 9 | Goods description correspondence | The goods description on the invoice must correspond to the LC goods description. | Art. 18(c) |
| 10 | Port match | The port of loading and port of discharge on the bill of lading must match the LC ports. | Art. 14(d), LC :44E/:44F |
| 11 | Consignee match | The consignee on the bill of lading must match the LC applicant. | Art. 14(d), LC :50 |
| 12 | Notify party match | The notify party on the bill of lading must match the LC applicant. | Art. 14(d), LC :50 |
| 13 | Required documents present | Every type of document required by the LC must be uploaded. | Art. 14(a), Art. 14(b) |
| 14 | On-board notation | The bill of lading must have an on-board notation. | Art. 20(a)(ii) |
| 15 | Endorsement (not checked in this version) | Whether a negotiable bill of lading is endorsed is not checked in this version. | Art. 14(a), endorsement practice |

## Sample score

The checking engine was verified with the three sets in the `samples/` folder.

| Set | Content | Result |
| --- | --- | --- |
| A | Clean documents | 0 discrepancies |
| B | Documents with 6 planted errors | Discrepancies on rules 1, 2, 6, 8, 9, 12 |
| C | Documents with 6 planted errors | Discrepancies on rules 4, 5, 7, 10, 13, 14 |

- All 12 planted errors were caught. (**12 / 12**)
- The two traps that "look wrong but are fine" produced no false discrepancies.
- This is verified by API unit tests and the e2e scoring test.

## Limits

- **Only text-layer PDFs and text files are supported.** Scanned paper documents cannot be read. OCR is planned for v2.
- **The 15 rules are a subset of UCP 600 practice.** ISBP (International Standard Banking Practice) is not included.
- **Rule 15 (endorsement) is not checked in this version.**
- **A certificate of origin cannot be uploaded in this version.** If the LC requires one, rule 13 reports it as a missing document.
- **Extraction quality is validated with DeepSeek only; other models are untested.**
- **The UI is available in Korean, English, and Russian.** Server-stored result messages and skip reasons are not translated yet, and the downloadable report remains Korean.
- **This tool is a pre-check.** The bank performs the final document examination and payment decision. The last line of the report carries the same notice.
