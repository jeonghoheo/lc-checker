import { Injectable } from '@nestjs/common';

const DEFAULT_LLM_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_LLM_MODEL = 'deepseek-chat';

type LlmResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

@Injectable()
export class AiExtractionService {
  async extract(text: string, fields: string[]): Promise<unknown> {
    return this.extractJson(
      'You extract structured trade document data. Return only a valid JSON object and do not include markdown or explanations.',
      [
        'Extract these fields from the document below.',
        'Return exactly one JSON object with these fields:',
        ...fields.map((field) => `- ${field}`),
        '',
        'Document:',
        text,
      ].join('\n'),
    );
  }

  async extractJson(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<unknown> {
    const apiKey =
      process.env.LLM_API_KEY?.trim() ||
      process.env.DEEPSEEK_API_KEY?.trim();

    if (!apiKey) {
      throw new Error(
        'LLM_API_KEY (or DEEPSEEK_API_KEY) is not set. Add it to apps/api/.env to enable AI features.',
      );
    }

    const baseUrl =
      process.env.LLM_BASE_URL?.trim() || DEFAULT_LLM_BASE_URL;
    const model =
      process.env.LLM_MODEL?.trim() ||
      process.env.DEEPSEEK_MODEL?.trim() ||
      DEFAULT_LLM_MODEL;

    const response = await fetch(buildChatCompletionsUrl(baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `LLM request failed (${response.status}): ${body}`,
      );
    }

    const payload = (await response.json()) as LlmResponse;
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('LLM response did not contain message content.');
    }

    try {
      return JSON.parse(content);
    } catch {
      throw new Error('LLM response was not valid JSON.');
    }
  }
}

function buildChatCompletionsUrl(baseUrl: string): string {
  const normalized = baseUrl.trim().replace(/\/+$/, '');

  return normalized.endsWith('/chat/completions')
    ? normalized
    : `${normalized}/chat/completions`;
}
