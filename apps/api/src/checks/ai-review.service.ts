import { Injectable } from '@nestjs/common';
import { AiExtractionService } from '../document-sets/ai-extraction.service.js';
import { requireObject, requireString } from '../document-sets/extraction-validation.js';

export type AiReviewVerdict =
  | 'corresponds'
  | 'discrepancy'
  | 'likely_typo'
  | 'different'
  | 'unsure';

export type AiReview = {
  verdict: AiReviewVerdict;
  reason: string;
};

const RULE_VERDICTS: Record<number, AiReviewVerdict[]> = {
  9: ['corresponds', 'discrepancy', 'unsure'],
  11: ['likely_typo', 'different', 'unsure'],
  12: ['likely_typo', 'different', 'unsure'],
};

const RULE_GUIDANCE: Record<number, string> = {
  9: 'Rule 9 compares the LC goods description with the invoice item descriptions.',
  11: 'Rule 11 compares the bill of lading consignee name with the LC applicant name.',
  12: 'Rule 12 compares the bill of lading notify party name with the LC applicant name.',
};

@Injectable()
export class AiReviewService {
  constructor(private readonly aiExtractionService: AiExtractionService) {}

  async review(
    ruleNo: number,
    failDetail: Record<string, unknown>,
  ): Promise<AiReview> {
    const allowedVerdicts = RULE_VERDICTS[ruleNo];

    if (!allowedVerdicts) {
      throw new Error(`AI review is not supported for rule ${ruleNo}.`);
    }

    const raw = await this.aiExtractionService.extractJson(
      [
        'You are a trade-document reviewer for letters of credit.',
        'Apply UCP 600 in plain words: the commercial invoice description must correspond to the LC description (Art. 18(c)); data must not conflict (Art. 14(d)) and exact sameness is not required.',
        'Return only a valid JSON object with the keys "verdict" and "reason".',
        'The "reason" must be one short sentence.',
      ].join(' '),
      [
        `Rule number: ${ruleNo}`,
        RULE_GUIDANCE[ruleNo]!,
        `Allowed verdicts: ${allowedVerdicts.join(', ')}.`,
        '',
        'FAIL detail JSON:',
        JSON.stringify(failDetail, null, 2),
      ].join('\n'),
    );

    const data = requireObject(raw);
    const verdict = requireString(data, 'verdict').toLowerCase();
    const reason = requireString(data, 'reason');

    if (!allowedVerdicts.includes(verdict as AiReviewVerdict)) {
      throw new Error(
        `AI review returned invalid verdict "${verdict}" for rule ${ruleNo}.`,
      );
    }

    return { verdict: verdict as AiReviewVerdict, reason };
  }
}
