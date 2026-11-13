import { Injectable } from '@nestjs/common';

export type ParsedLc = {
  creditNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  expiryPlace: string | null;
  applicant: string | null;
  beneficiary: string | null;
  currency: string | null;
  amount: number | null;
  tolerance: string | null;
  portOfLoading: string | null;
  portOfDischarge: string | null;
  latestShipmentDate: string | null;
  goodsDescription: string | null;
  documentsRequired: string | null;
  presentationDays: number | null;
};

const FIELD_HEADER = /^:([0-9]{2}[A-Z]?):(.*)$/;

const FIELD_LABELS: Record<string, string> = {
  '27': 'Sequence of Total',
  '40A': 'Form of Documentary Credit',
  '20': 'Documentary Credit Number',
  '31C': 'Date of Issue',
  '40E': 'Applicable Rules',
  '31D': 'Date and Place of Expiry',
  '50': 'Applicant',
  '59': 'Beneficiary',
  '32B': 'Currency Code, Amount',
  '39A': 'Percentage Credit Amount Tolerance',
  '41A': 'Available With... By...',
  '43P': 'Partial Shipments',
  '43T': 'Transhipment',
  '44E': 'Port of Loading',
  '44F': 'Port of Discharge',
  '44C': 'Latest Date of Shipment',
  '45A': 'Description of Goods and/or Services',
  '46A': 'Documents Required',
  '47A': 'Additional Conditions',
  '48': 'Period for Presentation',
  '71D': 'Charges',
};

@Injectable()
export class LcParserService {
  parse(text: string): ParsedLc {
    const fields = this.parseFields(text);
    const expiry = this.parseDateAndPlace(fields.get('31D'));
    const amount = this.parseCurrencyAndAmount(fields.get('32B'));

    return {
      creditNumber: this.field(fields, '20'),
      issueDate: this.parseDate(fields.get('31C')),
      expiryDate: expiry.date,
      expiryPlace: expiry.place,
      applicant: this.field(fields, '50'),
      beneficiary: this.field(fields, '59'),
      currency: amount.currency,
      amount: amount.value,
      tolerance: this.field(fields, '39A'),
      portOfLoading: this.field(fields, '44E'),
      portOfDischarge: this.field(fields, '44F'),
      latestShipmentDate: this.parseDate(fields.get('44C')),
      goodsDescription: this.field(fields, '45A'),
      documentsRequired: this.field(fields, '46A'),
      presentationDays: this.parsePresentationDays(fields.get('48')),
    };
  }

  private parseFields(text: string): Map<string, string> {
    const fields = new Map<string, string>();
    let currentTag: string | null = null;
    let currentLines: string[] = [];

    const flush = () => {
      if (currentTag !== null) {
        fields.set(currentTag, currentLines.join('\n').trim());
      }
      currentLines = [];
    };

    for (const line of text.split(/\r?\n/)) {
      const match = line.match(FIELD_HEADER);

      if (match) {
        flush();
        currentTag = match[1];

        const inlineValue = match[2].trim();
        if (inlineValue && inlineValue !== FIELD_LABELS[currentTag]) {
          currentLines.push(inlineValue);
        }
      } else if (currentTag !== null) {
        currentLines.push(line);
      }
    }

    flush();
    return fields;
  }

  private field(fields: Map<string, string>, tag: string): string | null {
    const value = fields.get(tag)?.trim();
    return value ? value : null;
  }

  private parseDate(value: string | undefined): string | null {
    const token = value?.trim();
    const match = token?.match(/^(\d{2})(\d{2})(\d{2})$/);

    if (!match) {
      return null;
    }

    return `20${match[1]}-${match[2]}-${match[3]}`;
  }

  private parseDateAndPlace(value: string | undefined) {
    const match = value?.trim().match(/^(\d{6})\s*([\s\S]*)$/);

    if (!match) {
      return { date: null, place: value?.trim() || null };
    }

    return {
      date: this.parseDate(match[1]),
      place: match[2].trim() || null,
    };
  }

  private parseCurrencyAndAmount(value: string | undefined) {
    const match = value?.trim().match(/^([A-Z]{3})\s*([0-9][0-9.,]*)/);

    if (!match) {
      return { currency: null, value: null };
    }

    return {
      currency: match[1],
      value: this.parseAmount(match[2]),
    };
  }

  private parseAmount(value: string): number | null {
    let normalized = value.trim();

    if (normalized.includes('.') && normalized.includes(',')) {
      const lastDot = normalized.lastIndexOf('.');
      const lastComma = normalized.lastIndexOf(',');

      normalized =
        lastComma > lastDot
          ? normalized.replace(/\./g, '').replace(',', '.')
          : normalized.replace(/,/g, '');
    } else if (normalized.includes(',')) {
      normalized = normalized.replace(',', '.');
    }

    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : null;
  }

  private parsePresentationDays(value: string | undefined): number | null {
    const match = value?.match(/(\d+)\s*DAYS?/i);

    if (!match) {
      return null;
    }

    return Number(match[1]);
  }
}
