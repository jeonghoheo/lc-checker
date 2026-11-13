import { Injectable } from '@nestjs/common';
import { AiExtractionService } from './ai-extraction.service.js';
import {
  requireIsoDate,
  requireNumber,
  requireObject,
  requireString,
} from './extraction-validation.js';

export type ExtractedPackingList = {
  packingListNumber: string;
  date: string;
  invoiceNumber: string;
  lcNumber: string;
  totalQuantity: number;
  totalCartons: number;
  totalNetWeightKg: number;
  totalGrossWeightKg: number;
  vessel: string;
};

const PACKING_LIST_FIELDS = [
  'packingListNumber (string)',
  'date (ISO yyyy-mm-dd string)',
  'invoiceNumber (string)',
  'lcNumber (string)',
  'totalQuantity (number)',
  'totalCartons (number)',
  'totalNetWeightKg (number)',
  'totalGrossWeightKg (number)',
  'vessel (string)',
];

@Injectable()
export class PackingListExtractionService {
  constructor(private readonly aiExtractionService: AiExtractionService) {}

  async extract(text: string): Promise<ExtractedPackingList> {
    const raw = await this.aiExtractionService.extract(
      text,
      PACKING_LIST_FIELDS,
    );
    const data = requireObject(raw);

    return {
      packingListNumber: requireString(data, 'packingListNumber'),
      date: requireIsoDate(data, 'date'),
      invoiceNumber: requireString(data, 'invoiceNumber'),
      lcNumber: requireString(data, 'lcNumber'),
      totalQuantity: requireNumber(data, 'totalQuantity'),
      totalCartons: requireNumber(data, 'totalCartons'),
      totalNetWeightKg: requireNumber(data, 'totalNetWeightKg'),
      totalGrossWeightKg: requireNumber(data, 'totalGrossWeightKg'),
      vessel: requireString(data, 'vessel'),
    };
  }
}
