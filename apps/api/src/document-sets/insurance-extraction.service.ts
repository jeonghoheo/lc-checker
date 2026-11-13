import { Injectable } from '@nestjs/common';
import { AiExtractionService } from './ai-extraction.service.js';
import {
  requireIsoDate,
  requireNumber,
  requireObject,
  requireString,
} from './extraction-validation.js';

export type ExtractedInsurance = {
  certificateNumber: string;
  policyNumber: string;
  issueDate: string;
  assured: string;
  currency: string;
  sumInsured: number;
  voyageFrom: string;
  voyageTo: string;
};

const INSURANCE_FIELDS = [
  'certificateNumber (string)',
  'policyNumber (string)',
  'issueDate (ISO yyyy-mm-dd string)',
  'assured (string)',
  'currency (string)',
  'sumInsured (number)',
  'voyageFrom (string)',
  'voyageTo (string)',
];

@Injectable()
export class InsuranceExtractionService {
  constructor(private readonly aiExtractionService: AiExtractionService) {}

  async extract(text: string): Promise<ExtractedInsurance> {
    const raw = await this.aiExtractionService.extract(text, INSURANCE_FIELDS);
    const data = requireObject(raw);

    return {
      certificateNumber: requireString(data, 'certificateNumber'),
      policyNumber: requireString(data, 'policyNumber'),
      issueDate: requireIsoDate(data, 'issueDate'),
      assured: requireString(data, 'assured'),
      currency: requireString(data, 'currency'),
      sumInsured: requireNumber(data, 'sumInsured'),
      voyageFrom: requireString(data, 'voyageFrom'),
      voyageTo: requireString(data, 'voyageTo'),
    };
  }
}
