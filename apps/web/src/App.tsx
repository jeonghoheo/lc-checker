import { useRef, useState } from 'react'
import {
  dictionaries,
  LANGUAGE_OPTIONS,
  LANGUAGE_STORAGE_KEY,
  type Dictionary,
  type ErrorKey,
  type Language,
  type MessageKey,
} from './i18n'

const API_URL = 'http://localhost:3000'

type DocumentItem = {
  id: string
  originalName: string
  sizeBytes: number
  docType: string | null
  extractedData: Record<string, unknown> | null
}

type DocumentSet = {
  id: string
  createdAt: string
  presentationDate: string | null
  documents: DocumentItem[]
}

type CheckResultStatus = 'PASS' | 'FAIL' | 'SKIPPED'

type CheckResultItem = {
  ruleNo: number
  status: CheckResultStatus
  detail: Record<string, unknown> | null
}

type CheckRun = {
  id: string
  results: CheckResultItem[]
}

function formatSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function docTypeLabel(docType: string | null, dictionary: Dictionary) {
  return (docType && dictionary.docTypes[docType]) || dictionary.docTypes.unknown
}

function formatExtractedValue(value: unknown) {
  if (value === null || value === undefined) {
    return '—'
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value, null, 2) ?? '—'
}

function extractedEntries(data: Record<string, unknown> | null) {
  if (!data) {
    return []
  }
  return Object.entries(data).map(([key, value]) => ({
    key,
    value: formatExtractedValue(value),
  }))
}

function countStatus(results: CheckResultItem[], status: CheckResultStatus) {
  return results.filter((result) => result.status === status).length
}

type ComparisonSide = {
  name: string
  value: string
}

type Comparison = {
  leftHeader: string
  rightHeader: string
  left: ComparisonSide
  right: ComparisonSide
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatComparedValue(value: unknown) {
  if (Array.isArray(value)) {
    return (
      value
        .map((item) =>
          typeof item === 'string' ? item : formatExtractedValue(item),
        )
        .join(' / ') || '—'
    )
  }
  return formatExtractedValue(value)
}

function detailLabel(
  detail: Record<string, unknown>,
  side: 'left' | 'right',
  fallback: string,
) {
  const labels = isRecord(detail.labels) ? detail.labels : null
  const label = labels?.[side]
  return typeof label === 'string' && label ? label : fallback
}

function buildComparison(
  ruleNo: number,
  detail: Record<string, unknown>,
  dictionary: Dictionary,
): Comparison | null {
  const compared = isRecord(detail.compared) ? detail.compared : null

  if (!compared) {
    return null
  }

  const labels = dictionary.comparison
  const pair = (
    leftName: string,
    leftValue: unknown,
    rightName: string,
    rightValue: unknown,
  ): Comparison => ({
    leftHeader: detailLabel(detail, 'left', labels.leftHeader),
    rightHeader: detailLabel(detail, 'right', labels.rightHeader),
    left: { name: leftName, value: formatComparedValue(leftValue) },
    right: { name: rightName, value: formatComparedValue(rightValue) },
  })

  switch (ruleNo) {
    case 1:
      return pair(
        labels.lcLatestShipmentDate,
        compared.latestShipmentDate,
        labels.blShippedOnBoardDate,
        compared.shippedOnBoardDate,
      )
    case 2:
      return pair(
        labels.lcPresentationDays,
        `${formatComparedValue(compared.presentationDays)}${labels.daysUnit}`,
        labels.daysToPresent,
        `${formatComparedValue(compared.days)}${labels.daysUnit}`,
      )
    case 3:
      return pair(
        labels.lcExpiryDate,
        compared.expiryDate,
        labels.presentationDate,
        compared.presentationDate,
      )
    case 4:
      return pair(
        labels.shipmentDate,
        compared.shipmentDate,
        labels.insuranceIssueDate,
        compared.insuranceIssueDate,
      )
    case 5: {
      const lcAmount = `${formatComparedValue(compared.lcCurrency)} ${formatComparedValue(compared.lcAmount)}`
      const maxAmount =
        compared.maxAmount === undefined
          ? ''
          : ` (${labels.limit} ${formatComparedValue(compared.maxAmount)})`
      const invoiceAmount = `${formatComparedValue(compared.invoiceCurrency)} ${formatComparedValue(compared.invoiceTotalAmount)}`

      return pair(
        labels.lcAmount,
        `${lcAmount}${maxAmount}`,
        labels.invoiceAmount,
        invoiceAmount,
      )
    }
    case 6:
      return pair(
        labels.packingGrossWeight,
        `${formatComparedValue(compared.packingListTotalGrossWeightKg)} kg`,
        labels.blGrossWeight,
        `${formatComparedValue(compared.billOfLadingTotalGrossWeightKg)} kg`,
      )
    case 7:
      return pair(
        labels.invoiceQuantity,
        compared.invoiceTotalQuantity,
        labels.packingQuantity,
        compared.packingListTotalQuantity,
      )
    case 8:
      return pair(
        labels.packingCartons,
        compared.packingListTotalCartons,
        labels.blCartons,
        compared.billOfLadingTotalCartons,
      )
    case 9:
      return pair(
        labels.lcGoodsDescription,
        compared.goodsDescription,
        labels.invoiceGoodsDescription,
        compared.invoiceItemDescriptions,
      )
    case 10:
      return pair(
        labels.lcPorts,
        `${labels.loading}: ${formatComparedValue(compared.lcPortOfLoading)}\n${labels.discharge}: ${formatComparedValue(compared.lcPortOfDischarge)}`,
        labels.blPorts,
        `${labels.loading}: ${formatComparedValue(compared.billOfLadingPortOfLoading)}\n${labels.discharge}: ${formatComparedValue(compared.billOfLadingPortOfDischarge)}`,
      )
    case 11:
      return pair(
        labels.lcApplicant,
        compared.lcApplicant,
        labels.blConsignee,
        compared.billOfLadingConsignee,
      )
    case 12:
      return pair(
        labels.lcApplicant,
        compared.lcApplicant,
        labels.blNotifyParty,
        compared.billOfLadingNotifyParty,
      )
    case 13:
      return pair(
        labels.requiredDocuments,
        compared.requiredTypes,
        labels.missingDocuments,
        compared.missingTypes,
      )
    case 14:
      return pair(
        labels.requiredNotation,
        labels.onBoardPresent,
        labels.blNotation,
        labels.onBoardAbsent,
      )
    default:
      return null
  }
}

function resultTitle(ruleNo: number, dictionary: Dictionary) {
  return dictionary.ruleNames[ruleNo] ?? dictionary.results.unknownRule(ruleNo)
}

function CheckResults({
  run,
  dictionary,
}: {
  run: CheckRun
  dictionary: Dictionary
}) {
  const [showPassed, setShowPassed] = useState(false)
  const failed = run.results.filter((result) => result.status === 'FAIL')
  const skipped = run.results.filter((result) => result.status === 'SKIPPED')
  const passed = run.results.filter((result) => result.status === 'PASS')

  return (
    <div className="results">
      <h3>{dictionary.results.failedHeading(failed.length)}</h3>
      {failed.length === 0 ? (
        <p>{dictionary.results.noFailed}</p>
      ) : (
        <ul className="result-list">
          {failed.map((result) => {
            const detail = result.detail ?? {}
            const comparison = buildComparison(
              result.ruleNo,
              detail,
              dictionary,
            )
            const aiReview = isRecord(detail.aiReview)
              ? detail.aiReview
              : null
            const message =
              typeof detail.message === 'string' ? detail.message : null
            const verdict =
              aiReview && typeof aiReview.verdict === 'string'
                ? dictionary.verdicts[aiReview.verdict] ?? aiReview.verdict
                : null
            const reviewReason =
              aiReview && typeof aiReview.reason === 'string'
                ? aiReview.reason
                : null

            return (
              <li key={result.ruleNo} className="result-row result-fail">
                <div className="result-title">
                  <span className="result-badge fail">
                    {dictionary.results.badgeFailed}
                  </span>
                  <span className="rule-name">
                    {resultTitle(result.ruleNo, dictionary)}
                  </span>
                </div>
                {comparison && (
                  <div className="compare-grid">
                    <div className="compare-column">
                      <div className="compare-header">
                        {comparison.leftHeader}
                      </div>
                      <div className="compare-name">
                        {comparison.left.name}
                      </div>
                      <div className="compare-value">
                        {comparison.left.value}
                      </div>
                    </div>
                    <div className="compare-column">
                      <div className="compare-header">
                        {comparison.rightHeader}
                      </div>
                      <div className="compare-name">
                        {comparison.right.name}
                      </div>
                      <div className="compare-value">
                        {comparison.right.value}
                      </div>
                    </div>
                  </div>
                )}
                {message && <p className="result-message">{message}</p>}
                {verdict && (
                  <div className="ai-note">
                    <strong>{dictionary.aiNotePrefix}</strong> {verdict}
                    {reviewReason ? ` — ${reviewReason}` : ''}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <h3>{dictionary.results.skippedHeading(skipped.length)}</h3>
      {skipped.length === 0 ? (
        <p>{dictionary.results.noSkipped}</p>
      ) : (
        <ul className="result-list">
          {skipped.map((result) => {
            const detail = result.detail ?? {}
            const reason =
              typeof detail.reason === 'string'
                ? detail.reason
                : dictionary.results.noReason

            return (
              <li key={result.ruleNo} className="result-row result-skipped">
                <div className="result-title">
                  <span className="result-badge skipped">
                    {dictionary.results.badgeSkipped}
                  </span>
                  <span className="rule-name">
                    {resultTitle(result.ruleNo, dictionary)}
                  </span>
                </div>
                <p className="result-message">{reason}</p>
              </li>
            )
          })}
        </ul>
      )}

      <h3>{dictionary.results.passedHeading(passed.length)}</h3>
      <button type="button" onClick={() => setShowPassed((current) => !current)}>
        {showPassed
          ? dictionary.results.hidePassed
          : dictionary.results.showPassed}
      </button>
      {showPassed &&
        (passed.length === 0 ? (
          <p>{dictionary.results.noPassed}</p>
        ) : (
          <ul className="result-list">
            {passed.map((result) => (
              <li key={result.ruleNo} className="result-row result-pass">
                <span className="result-badge pass">
                  {dictionary.results.badgePassed}
                </span>
                <span className="rule-name">
                  {resultTitle(result.ruleNo, dictionary)}
                </span>
              </li>
            ))}
          </ul>
        ))}
    </div>
  )
}

function initialLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return stored === 'en' || stored === 'ru' || stored === 'ko' ? stored : 'ko'
}

function App() {
  const [language, setLanguage] = useState<Language>(initialLanguage)
  const dictionary = dictionaries[language]
  const [setId, setSetId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [errorKey, setErrorKey] = useState<ErrorKey | null>(null)
  const [messageKey, setMessageKey] = useState<MessageKey | null>(null)
  const [expandedDocIds, setExpandedDocIds] = useState<string[]>([])
  const [presentationDate, setPresentationDate] = useState('')
  const [checkRun, setCheckRun] = useState<CheckRun | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage)
    localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage)
  }

  async function refreshDocuments(id: string) {
    const response = await fetch(`${API_URL}/document-sets/${id}`)
    if (!response.ok) {
      throw new Error('Request failed')
    }
    const data = (await response.json()) as DocumentSet
    setDocuments(data.documents)
    if (data.presentationDate) {
      setPresentationDate(data.presentationDate.slice(0, 10))
    }
  }

  async function createSet() {
    setBusy(true)
    setErrorKey(null)
    setMessageKey(null)

    try {
      const response = await fetch(`${API_URL}/document-sets`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Request failed')
      }
      const data = (await response.json()) as { id: string }
      setSetId(data.id)
      setDocuments([])
      setExpandedDocIds([])
      setPresentationDate('')
      setCheckRun(null)
      setMessageKey('newSet')
    } catch {
      setErrorKey('createSet')
    } finally {
      setBusy(false)
    }
  }

  async function uploadFile() {
    if (!setId) {
      setErrorKey('noSet')
      return
    }
    if (!file) {
      setErrorKey('noFile')
      return
    }

    setBusy(true)
    setErrorKey(null)
    setMessageKey(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `${API_URL}/document-sets/${setId}/documents`,
        { method: 'POST', body: formData },
      )
      if (!response.ok) {
        throw new Error('Request failed')
      }

      await refreshDocuments(setId)
      setCheckRun(null)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setMessageKey('uploaded')
    } catch {
      setErrorKey('upload')
    } finally {
      setBusy(false)
    }
  }

  async function savePresentationDate() {
    if (!setId) {
      setErrorKey('noSet')
      return
    }
    if (!presentationDate) {
      setErrorKey('dateRequired')
      return
    }

    setBusy(true)
    setErrorKey(null)
    setMessageKey(null)

    try {
      const response = await fetch(
        `${API_URL}/document-sets/${setId}/presentation-date`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presentationDate }),
        },
      )
      if (!response.ok) {
        throw new Error('Request failed')
      }
      setCheckRun(null)
      setMessageKey('dateSaved')
    } catch {
      setErrorKey('dateSave')
    } finally {
      setBusy(false)
    }
  }

  async function runCheck() {
    if (!setId) {
      setErrorKey('noSet')
      return
    }

    setBusy(true)
    setErrorKey(null)
    setMessageKey(null)

    try {
      const response = await fetch(
        `${API_URL}/document-sets/${setId}/check`,
        { method: 'POST' },
      )
      if (!response.ok) {
        throw new Error('Request failed')
      }
      const data = (await response.json()) as CheckRun
      setCheckRun(data)
    } catch {
      setErrorKey('check')
    } finally {
      setBusy(false)
    }
  }

  async function downloadReport() {
    if (!setId) {
      setErrorKey('noSet')
      return
    }

    setBusy(true)
    setErrorKey(null)
    setMessageKey(null)

    try {
      const response = await fetch(
        `${API_URL}/document-sets/${setId}/report`,
      )
      if (!response.ok) {
        throw new Error('Request failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const disposition = response.headers.get('content-disposition')
      const filenameMatch = disposition?.match(/filename="?([^";]+)"?/)
      const link = document.createElement('a')
      link.href = url
      link.download = filenameMatch?.[1] ?? `lc-report-${setId}.html`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setMessageKey('reportDownloaded')
    } catch {
      setErrorKey('report')
    } finally {
      setBusy(false)
    }
  }

  function toggleDocument(id: string) {
    setExpandedDocIds((current) =>
      current.includes(id)
        ? current.filter((candidate) => candidate !== id)
        : [...current, id],
    )
  }

  return (
    <main>
      <div className="language-switcher">
        {LANGUAGE_OPTIONS.map((option) => (
          <button
            key={option.code}
            type="button"
            className={language === option.code ? 'active' : undefined}
            onClick={() => changeLanguage(option.code)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <h1>{dictionary.title}</h1>

      {errorKey && <p className="error">{dictionary.errors[errorKey]}</p>}
      {messageKey && (
        <p className="message">{dictionary.messages[messageKey]}</p>
      )}

      <section>
        <h2>{dictionary.sectionUpload}</h2>

        <div className="actions">
          <button type="button" onClick={createSet} disabled={busy}>
            {dictionary.createSet}
          </button>
          {setId && (
            <span className="set-id">
              {dictionary.currentSet} {setId}
            </span>
          )}
        </div>

        <div className="actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,text/plain"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            disabled={!setId || busy}
          />
          <button
            type="button"
            onClick={uploadFile}
            disabled={!setId || !file || busy}
          >
            {dictionary.upload}
          </button>
        </div>
      </section>

      <section>
        <h2>{dictionary.sectionDocuments}</h2>
        {documents.length === 0 ? (
          <p>{dictionary.noDocuments}</p>
        ) : (
          <ul className="document-list">
            {documents.map((document) => {
              const expanded = expandedDocIds.includes(document.id)
              const entries = extractedEntries(document.extractedData)

              return (
                <li key={document.id} className="document-item">
                  <div className="document-heading">
                    <span>
                      {document.originalName} ({formatSize(document.sizeBytes)})
                    </span>
                    <span className="doc-type">
                      {docTypeLabel(document.docType, dictionary)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleDocument(document.id)}
                  >
                    {expanded
                      ? dictionary.hideValues
                      : dictionary.showValues}
                  </button>
                  {expanded && (
                    <div className="value-list">
                      {entries.length === 0 ? (
                        <p>{dictionary.noValues}</p>
                      ) : (
                        entries.map((entry) => (
                          <div className="value-row" key={entry.key}>
                            <span className="value-key">{entry.key}</span>
                            <span className="value-text">{entry.value}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h2>{dictionary.sectionPresentationDate}</h2>
        <div className="date-field">
          <label htmlFor="presentation-date">
            {dictionary.presentationDateLabel}
          </label>
          <input
            id="presentation-date"
            type="date"
            value={presentationDate}
            onChange={(event) => setPresentationDate(event.target.value)}
            disabled={!setId || busy}
          />
        </div>
        <p className="helper">{dictionary.presentationDateHelper}</p>
        <button
          type="button"
          onClick={savePresentationDate}
          disabled={!setId || !presentationDate || busy}
        >
          {dictionary.savePresentationDate}
        </button>
      </section>

      <section>
        <h2>{dictionary.sectionCheck}</h2>
        <div className="actions">
          <button type="button" onClick={runCheck} disabled={!setId || busy}>
            {dictionary.runCheck}
          </button>
          <button
            type="button"
            onClick={downloadReport}
            disabled={!setId || !checkRun || busy}
          >
            {dictionary.downloadReport}
          </button>
        </div>
        {checkRun && (
          <>
            <p className="check-summary">
              {dictionary.summary(
                countStatus(checkRun.results, 'PASS'),
                countStatus(checkRun.results, 'FAIL'),
                countStatus(checkRun.results, 'SKIPPED'),
              )}
            </p>
            <CheckResults
              key={`${checkRun.id}-${language}`}
              run={checkRun}
              dictionary={dictionary}
            />
          </>
        )}
      </section>
    </main>
  )
}

export default App
