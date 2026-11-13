import { AiExtractionService } from './ai-extraction.service.js';

function llmResponse(content: unknown) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(content) } }],
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

describe('AiExtractionService', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('builds the request URL from LLM_BASE_URL', async () => {
    vi.stubEnv('LLM_API_KEY', 'test-key');
    vi.stubEnv('LLM_BASE_URL', 'https://llm.example.test/v1/');
    vi.stubEnv('LLM_MODEL', 'test-model');
    const fetchMock = vi.fn().mockResolvedValue(llmResponse({ value: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    const service = new AiExtractionService();

    await expect(
      service.extract('document text', ['value (string)']),
    ).resolves.toEqual({ value: 'ok' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      model: string;
      messages: Array<{ content: string }>;
    };

    expect(url).toBe('https://llm.example.test/v1/chat/completions');
    expect(body.model).toBe('test-model');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer test-key',
    });
  });

  it('falls back to DEEPSEEK_* names and the default base URL', async () => {
    vi.stubEnv('LLM_API_KEY', '');
    vi.stubEnv('LLM_BASE_URL', '');
    vi.stubEnv('LLM_MODEL', '');
    vi.stubEnv('DEEPSEEK_API_KEY', 'legacy-key');
    vi.stubEnv('DEEPSEEK_MODEL', 'legacy-model');
    const fetchMock = vi.fn().mockResolvedValue(llmResponse({ value: 'ok' }));
    vi.stubGlobal('fetch', fetchMock);
    const service = new AiExtractionService();

    await service.extract('document text', ['value (string)']);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { model: string };

    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect(body.model).toBe('legacy-model');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer legacy-key',
    });
  });
});
