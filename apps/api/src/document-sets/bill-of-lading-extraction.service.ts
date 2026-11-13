import { Injectable } from '@nestjs/common';
import { AiExtractionService } from './ai-extraction.service.js';
import {
  optionalIsoDate,
  requireBoolean,
  requireIsoDate,
  requireNumber,
  requireObject,
  requireString,
} from './extraction-validation.js';

export type ExtractedBillOfLading = {
  blNumber: string;
  shipper: string;
  consignee: string;
  notifyParty: string;
  vessel: string;
  voyage: string;
  portOfLoading: string;
  portOfDischarge: string;
  shippedOnBoardDate: string | null;
  issueDate: string;
  totalCartons: number;
  totalGrossWeightKg: number;
  goodsDescription: string;
  freightPrepaid: boolean;
  cleanOnBoard: boolean;
};

const BILL_OF_LADING_FIELDS = [
  'blNumber (string)',
  'shipper (string)',
  'consignee (string)',
  'notifyParty (string)',
  'vessel (string)',
  'voyage (string)',
  'portOfLoading (string)',
  'portOfDischarge (string)',
  'shippedOnBoardDate (ISO yyyy-mm-dd string, or null if the document has no shipped-on-board date)',
  'issueDate (ISO yyyy-mm-dd string from the Place and Date of Issue)',
  'totalCartons (number)',
  'totalGrossWeightKg (number)',
  'goodsDescription (string)',
  'freightPrepaid (boolean)',
  'cleanOnBoard (boolean, true only if the document states clean on board)',
];

@Injectable()
export class BillOfLadingExtractionService {
  constructor(private readonly aiExtractionService: AiExtractionService) {}

  async extract(text: string): Promise<ExtractedBillOfLading> {
    const raw = await this.aiExtractionService.extract(
      text,
      BILL_OF_LADING_FIELDS,
    );
    const data = requireObject(raw);

    return {
      blNumber: requireString(data, 'blNumber'),
      shipper: requireString(data, 'shipper'),
      consignee: requireString(data, 'consignee'),
      notifyParty: requireString(data, 'notifyParty'),
      vessel: requireString(data, 'vessel'),
      voyage: requireString(data, 'voyage'),
      portOfLoading: requireString(data, 'portOfLoading'),
      portOfDischarge: requireString(data, 'portOfDischarge'),
      shippedOnBoardDate: optionalIsoDate(data, 'shippedOnBoardDate'),
      issueDate: requireIsoDate(data, 'issueDate'),
      totalCartons: requireNumber(data, 'totalCartons'),
      totalGrossWeightKg: requireNumber(data, 'totalGrossWeightKg'),
      goodsDescription: requireString(data, 'goodsDescription'),
      freightPrepaid: requireBoolean(data, 'freightPrepaid'),
      cleanOnBoard: requireBoolean(data, 'cleanOnBoard'),
    };
  }
}
