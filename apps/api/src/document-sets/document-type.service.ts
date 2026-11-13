import { Injectable } from '@nestjs/common';

export type DetectedDocumentType =
  | 'LC'
  | 'INVOICE'
  | 'PACKING_LIST'
  | 'BILL_OF_LADING'
  | 'INSURANCE'
  | null;

@Injectable()
export class DocumentTypeService {
  detect(text: string): DetectedDocumentType {
    if (text.includes(':40A:') && text.includes(':20:')) {
      return 'LC';
    }

    const upperText = text.toUpperCase();

    if (upperText.includes('COMMERCIAL INVOICE')) {
      return 'INVOICE';
    }

    if (upperText.includes('PACKING LIST')) {
      return 'PACKING_LIST';
    }

    if (upperText.includes('BILL OF LADING')) {
      return 'BILL_OF_LADING';
    }

    if (
      upperText.includes('INSURANCE CERTIFICATE') ||
      upperText.includes('INSURANCE POLICY')
    ) {
      return 'INSURANCE';
    }

    return null;
  }
}
