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
        <button
          type="button"
          onClick={runCheck}
          disabled={!setId || busy}
        >
          검사 실행
        </button>
        {checkRun && (
          <p className="check-summary">
            검사 완료 — 통과 {countStatus(checkRun.results, 'PASS')}개 ·
            불일치 {countStatus(checkRun.results, 'FAIL')}개 · 검사 못함{' '}
            {countStatus(checkRun.results, 'SKIPPED')}개
          </p>
        )}
      </section>
    </main>
  )
}

export default App
