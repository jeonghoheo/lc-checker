import { Injectable } from '@nestjs/common';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

@Injectable()
export class AiExtractionService {
  async extract(text: string, fields: string[]): Promise<unknown> {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      throw new Error(
        'DEEPSEEK_API_KEY is not set. Add it to apps/api/.env to enable AI extraction.',
      );
    }

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content:
              'You extract structured trade document data. Return only a valid JSON object and do not include markdown or explanations.',
          },
          {
            role: 'user',
            content: [
              'Extract these fields from the document below.',
              'Return exactly one JSON object with these fields:',
              ...fields.map((field) => `- ${field}`),
              '',
              'Document:',
              text,
            ].join('\n'),
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `DeepSeek request failed (${response.status}): ${body}`,
      );
    }

    const payload = (await response.json()) as DeepSeekResponse;
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('DeepSeek response did not contain message content.');
    }

    try {
      return JSON.parse(content);
    } catch {
      throw new Error('DeepSeek response was not valid JSON.');
    }
  }
}
