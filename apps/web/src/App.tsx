import { useRef, useState } from 'react'

const API_URL = 'http://localhost:3000'

type DocumentItem = {
  id: string
  originalName: string
  sizeBytes: number
}

type DocumentSet = {
  id: string
  createdAt: string
  documents: DocumentItem[]
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

function App() {
  const [setId, setSetId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function refreshDocuments(id: string) {
    const response = await fetch(`${API_URL}/document-sets/${id}`)
    if (!response.ok) {
      throw new Error(await readError(response))
    }
    const data = (await response.json()) as DocumentSet
    setDocuments(data.documents)
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

  return (
    <main>
      <h1>신용장 서류 대조</h1>

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

      {error && <p className="error">{error}</p>}
      {message && <p className="message">{message}</p>}

      <h2>업로드된 파일</h2>
      {documents.length === 0 ? (
        <p>업로드된 파일이 없습니다.</p>
      ) : (
        <ul>
          {documents.map((document) => (
            <li key={document.id}>
              {document.originalName} ({formatSize(document.sizeBytes)})
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default App
