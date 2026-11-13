import { useRef, useState } from 'react'

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

const DOC_TYPE_LABELS: Record<string, string> = {
  LC: '신용장',
  INVOICE: '상업송장',
  PACKING_LIST: '포장명세서',
  BILL_OF_LADING: '선하증권',
  INSURANCE: '보험증서',
}

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { message?: string | string[] }
    if (Array.isArray(data.message)) {
      return data.message.join(', ')
    }
    if (data.message) {
      return data.message
    }
  } catch {
    // ignore non-JSON error bodies
  }
  return response.statusText
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

function docTypeLabel(docType: string | null) {
  return (docType && DOC_TYPE_LABELS[docType]) || '종류 미확인'
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

const RULE_NAMES: Record<number, string> = {
  1: '선적 마감일',
  2: '제시 기한 (21일)',
  3: '신용장 만료일',
  4: '보험 날짜',
  5: '송장 금액 한도',
  6: '총중량 일치',
  7: '수량 일치',
  8: '상자 수 일치',
  9: '물품 설명 대응',
  10: '항구 일치',
  11: '수하인 일치',
  12: '통지처 일치',
  13: '요구 서류 구비',
  14: '본선적재 표기',
  15: '배서 (이번 버전 검사 제외)',
}

const AI_VERDICT_LABELS: Record<string, string> = {
  corresponds: '같은 물품으로 보임',
  discrepancy: '실제로 다름',
  likely_typo: '오타로 보임',
  different: '다른 회사로 보임',
  unsure: '판단 보류',
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
): Comparison | null {
  const compared = isRecord(detail.compared) ? detail.compared : null

  if (!compared) {
    return null
  }

  const pair = (
    leftName: string,
    leftValue: unknown,
    rightName: string,
    rightValue: unknown,
  ): Comparison => ({
    leftHeader: detailLabel(detail, 'left', '신용장·기준 값'),
    rightHeader: detailLabel(detail, 'right', '서류 값'),
    left: { name: leftName, value: formatComparedValue(leftValue) },
    right: { name: rightName, value: formatComparedValue(rightValue) },
  })

  switch (ruleNo) {
    case 1:
      return pair(
        '신용장 선적 마감일',
        compared.latestShipmentDate,
        '선하증권 본선적재일',
        compared.shippedOnBoardDate,
      )
    case 2:
      return pair(
        '신용장 제시 기한',
        `${formatComparedValue(compared.presentationDays)}일`,
        '제시까지 걸린 날',
        `${formatComparedValue(compared.days)}일`,
      )
    case 3:
      return pair(
        '신용장 만료일',
        compared.expiryDate,
        '제시일',
        compared.presentationDate,
      )
    case 4:
      return pair(
        '선적일',
        compared.shipmentDate,
        '보험 발행일',
        compared.insuranceIssueDate,
      )
    case 5: {
      const lcAmount = `${formatComparedValue(compared.lcCurrency)} ${formatComparedValue(compared.lcAmount)}`
      const maxAmount =
        compared.maxAmount === undefined
          ? ''
          : ` (한도 ${formatComparedValue(compared.maxAmount)})`
      const invoiceAmount = `${formatComparedValue(compared.invoiceCurrency)} ${formatComparedValue(compared.invoiceTotalAmount)}`

      return pair(
        '신용장 금액',
        `${lcAmount}${maxAmount}`,
        '송장 금액',
        invoiceAmount,
      )
    }
    case 6:
      return pair(
        '포장명세서 총중량',
        `${formatComparedValue(compared.packingListTotalGrossWeightKg)} kg`,
        '선하증권 총중량',
        `${formatComparedValue(compared.billOfLadingTotalGrossWeightKg)} kg`,
      )
    case 7:
      return pair(
        '송장 수량',
        compared.invoiceTotalQuantity,
        '포장명세서 수량',
        compared.packingListTotalQuantity,
      )
    case 8:
      return pair(
        '포장명세서 상자 수',
        compared.packingListTotalCartons,
        '선하증권 상자 수',
        compared.billOfLadingTotalCartons,
      )
    case 9:
      return pair(
        '신용장 물품 설명',
        compared.goodsDescription,
        '송장 물품 설명',
        compared.invoiceItemDescriptions,
      )
    case 10:
      return pair(
        '신용장 항구',
        `선적: ${formatComparedValue(compared.lcPortOfLoading)}\n하적: ${formatComparedValue(compared.lcPortOfDischarge)}`,
        '선하증권 항구',
        `선적: ${formatComparedValue(compared.billOfLadingPortOfLoading)}\n하적: ${formatComparedValue(compared.billOfLadingPortOfDischarge)}`,
      )
    case 11:
      return pair(
        '신용장 신청인',
        compared.lcApplicant,
        '선하증권 수하인',
        compared.billOfLadingConsignee,
      )
    case 12:
      return pair(
        '신용장 신청인',
        compared.lcApplicant,
        '선하증권 통지처',
        compared.billOfLadingNotifyParty,
      )
    case 13:
      return pair(
        '신용장 요구 서류',
        compared.requiredTypes,
        '빠진 서류',
        compared.missingTypes,
      )
    case 14:
      return pair('필요한 표기', '본선적재 표기 있음', '선하증권 표기', '표기 없음')
    default:
      return null
  }
}

function resultTitle(ruleNo: number) {
  return RULE_NAMES[ruleNo] ?? `검사 ${ruleNo}`
}

function CheckResults({ run }: { run: CheckRun }) {
  const [showPassed, setShowPassed] = useState(false)
  const failed = run.results.filter((result) => result.status === 'FAIL')
  const skipped = run.results.filter((result) => result.status === 'SKIPPED')
  const passed = run.results.filter((result) => result.status === 'PASS')

  return (
    <div className="results">
      <h3>불일치 {failed.length}개</h3>
      {failed.length === 0 ? (
        <p>불일치가 없습니다.</p>
      ) : (
        <ul className="result-list">
          {failed.map((result) => {
            const detail = result.detail ?? {}
            const comparison = buildComparison(result.ruleNo, detail)
            const aiReview = isRecord(detail.aiReview)
              ? detail.aiReview
              : null
            const message =
              typeof detail.message === 'string' ? detail.message : null
            const verdict =
              aiReview && typeof aiReview.verdict === 'string'
                ? AI_VERDICT_LABELS[aiReview.verdict] ?? aiReview.verdict
                : null
            const reviewReason =
              aiReview && typeof aiReview.reason === 'string'
                ? aiReview.reason
                : null

            return (
              <li
                key={result.ruleNo}
                className="result-row result-fail"
              >
                <div className="result-title">
                  <span className="result-badge fail">불일치</span>
                  <span className="rule-name">
                    {resultTitle(result.ruleNo)}
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
                    <strong>AI 참고 의견:</strong> {verdict}
                    {reviewReason ? ` — ${reviewReason}` : ''}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <h3>검사 못함 {skipped.length}개</h3>
      {skipped.length === 0 ? (
        <p>검사 못한 항목이 없습니다.</p>
      ) : (
        <ul className="result-list">
          {skipped.map((result) => {
            const detail = result.detail ?? {}
            const reason =
              typeof detail.reason === 'string' ? detail.reason : '이유 없음'

            return (
              <li
                key={result.ruleNo}
                className="result-row result-skipped"
              >
                <div className="result-title">
                  <span className="result-badge skipped">검사 못함</span>
                  <span className="rule-name">
                    {resultTitle(result.ruleNo)}
                  </span>
                </div>
                <p className="result-message">{reason}</p>
              </li>
            )
          })}
        </ul>
      )}

      <h3>통과 {passed.length}개</h3>
      <button type="button" onClick={() => setShowPassed((current) => !current)}>
        {showPassed ? '통과한 검사 숨기기' : '통과한 검사 보기'}
      </button>
      {showPassed && (
        <ul className="result-list">
          {passed.map((result) => (
            <li key={result.ruleNo} className="result-row result-pass">
              <span className="result-badge pass">통과</span>
              <span className="rule-name">{resultTitle(result.ruleNo)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function App() {
  const [setId, setSetId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [expandedDocIds, setExpandedDocIds] = useState<string[]>([])
  const [presentationDate, setPresentationDate] = useState('')
  const [checkRun, setCheckRun] = useState<CheckRun | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function refreshDocuments(id: string) {
    const response = await fetch(`${API_URL}/document-sets/${id}`)
    if (!response.ok) {
      throw new Error(await readError(response))
    }
    const data = (await response.json()) as DocumentSet
    setDocuments(data.documents)
    if (data.presentationDate) {
      setPresentationDate(data.presentationDate.slice(0, 10))
    }
  }

  async function createSet() {
    setBusy(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(`${API_URL}/document-sets`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error(await readError(response))
      }
      const data = (await response.json()) as { id: string }
      setSetId(data.id)
      setDocuments([])
      setExpandedDocIds([])
      setPresentationDate('')
      setCheckRun(null)
      setMessage('새 세트가 만들어졌습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '세트를 만들지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function uploadFile() {
    if (!setId) {
      setError('먼저 새 세트를 만들어 주세요.')
      return
    }
    if (!file) {
      setError('업로드할 파일을 선택해 주세요.')
      return
    }

    setBusy(true)
    setError(null)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(
        `${API_URL}/document-sets/${setId}/documents`,
        { method: 'POST', body: formData },
      )
      if (!response.ok) {
        throw new Error(await readError(response))
      }

      await refreshDocuments(setId)
      setCheckRun(null)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setMessage('파일이 업로드되었습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  async function savePresentationDate() {
    if (!setId) {
      setError('먼저 새 세트를 만들어 주세요.')
      return
    }
    if (!presentationDate) {
      setError('은행에 서류를 내는 날짜를 선택해 주세요.')
      return
    }

    setBusy(true)
    setError(null)
    setMessage(null)

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
        throw new Error(await readError(response))
      }
      setCheckRun(null)
      setMessage('제시일을 저장했습니다.')
    } catch {
      setError(
        '제시일 저장에 실패했습니다. 서버가 켜져 있는지 확인해 주세요.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function runCheck() {
    if (!setId) {
      setError('먼저 새 세트를 만들어 주세요.')
      return
    }

    setBusy(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(
        `${API_URL}/document-sets/${setId}/check`,
        { method: 'POST' },
      )
      if (!response.ok) {
        throw new Error(await readError(response))
      }
      const data = (await response.json()) as CheckRun
      setCheckRun(data)
    } catch {
      setError('검사에 실패했습니다. 서버가 켜져 있는지 확인해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  async function downloadReport() {
    if (!setId) {
      setError('먼저 새 세트를 만들어 주세요.')
      return
    }

    setBusy(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch(
        `${API_URL}/document-sets/${setId}/report`,
      )
      if (!response.ok) {
        throw new Error(await readError(response))
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
      setMessage('보고서를 내려받았습니다.')
    } catch {
      setError('보고서를 받지 못했습니다. 검사를 먼저 실행해 주세요.')
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
      <h1>신용장 서류 대조</h1>

      {error && <p className="error">{error}</p>}
      {message && <p className="message">{message}</p>}

      <section>
        <h2>서류 올리기</h2>

        <div className="actions">
          <button type="button" onClick={createSet} disabled={busy}>
            새 세트 만들기
          </button>
          {setId && <span className="set-id">현재 세트: {setId}</span>}
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
            올리기
          </button>
        </div>
      </section>

      <section>
        <h2>올린 서류 목록</h2>
        {documents.length === 0 ? (
          <p>업로드된 파일이 없습니다.</p>
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
                      {docTypeLabel(document.docType)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleDocument(document.id)}
                  >
                    {expanded ? '뽑은 값 숨기기' : '뽑은 값 보기'}
                  </button>
                  {expanded && (
                    <div className="value-list">
                      {entries.length === 0 ? (
                        <p>뽑은 값이 없습니다.</p>
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
        <h2>제시일 입력</h2>
        <div className="date-field">
          <label htmlFor="presentation-date">
            은행에 서류를 내는 날짜
          </label>
          <input
            id="presentation-date"
            type="date"
            value={presentationDate}
            onChange={(event) => setPresentationDate(event.target.value)}
            disabled={!setId || busy}
          />
        </div>
        <p className="helper">
          이 날짜가 있어야 제시 기한 검사가 돌아갑니다.
        </p>
        <button
          type="button"
          onClick={savePresentationDate}
          disabled={!setId || !presentationDate || busy}
        >
          제시일 저장
        </button>
      </section>

      <section>
        <h2>검사 실행</h2>
        <div className="actions">
          <button
            type="button"
            onClick={runCheck}
            disabled={!setId || busy}
          >
            검사 실행
          </button>
          <button
            type="button"
            onClick={downloadReport}
            disabled={!setId || !checkRun || busy}
          >
            보고서 받기
          </button>
        </div>
        {checkRun && (
          <>
            <p className="check-summary">
              검사 완료 — 통과 {countStatus(checkRun.results, 'PASS')}개 ·
              불일치 {countStatus(checkRun.results, 'FAIL')}개 · 검사 못함{' '}
              {countStatus(checkRun.results, 'SKIPPED')}개
            </p>
            <CheckResults key={checkRun.id} run={checkRun} />
          </>
        )}
      </section>
    </main>
  )
}

export default App
