import { Injectable } from '@nestjs/common';
import { AiExtractionService } from './ai-extraction.service.js';

export type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type ExtractedInvoice = {
  invoiceNumber: string;
  invoiceDate: string;
  sellerName: string;
  buyerName: string;
  lcNumber: string;
  currency: string;
  totalAmount: number;
  totalQuantity: number;
  items: InvoiceItem[];
};

const INVOICE_FIELDS = [
  'invoiceNumber (string)',
  'invoiceDate (ISO yyyy-mm-dd string)',
  'sellerName (string)',
  'buyerName (string)',
  'lcNumber (string)',
  'currency (string)',
  'totalAmount (number)',
  'totalQuantity (number)',
  'items (array of objects with description (string), quantity (number), unitPrice (number), amount (number))',
];

@Injectable()
export class InvoiceExtractionService {
  constructor(private readonly aiExtractionService: AiExtractionService) {}

  async extract(text: string): Promise<ExtractedInvoice> {
    const raw = await this.aiExtractionService.extract(text, INVOICE_FIELDS);
    return this.validate(raw);
  }

  private validate(raw: unknown): ExtractedInvoice {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('AI response is not a JSON object.');
    }

    const data = raw as Record<string, unknown>;
    const invoiceDate = this.requireString(data, 'invoiceDate');

    if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate)) {
      throw new Error(
        'Invalid field "invoiceDate": expected an ISO date (yyyy-mm-dd).',
      );
    }

    const totalAmount = this.requireNumber(data, 'totalAmount');
    const totalQuantity = this.requireNumber(data, 'totalQuantity');
    const items = this.validateItems(data.items);
    const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0);

    if (Math.abs(itemsTotal - totalAmount) > 0.01) {
      throw new Error(
        `Items amount total ${itemsTotal.toFixed(2)} does not match totalAmount ${totalAmount.toFixed(2)} (tolerance 0.01).`,
      );
    }

    return {
      invoiceNumber: this.requireString(data, 'invoiceNumber'),
      invoiceDate,
      sellerName: this.requireString(data, 'sellerName'),
      buyerName: this.requireString(data, 'buyerName'),
      lcNumber: this.requireString(data, 'lcNumber'),
      currency: this.requireString(data, 'currency'),
      totalAmount,
      totalQuantity,
      items,
    };
  }

  private validateItems(value: unknown): InvoiceItem[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error(
        'Invalid or missing field "items": expected a non-empty array.',
      );
    }

    return value.map((rawItem, index) => {
      if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
        throw new Error(`Invalid field "items[${index}]": expected an object.`);
      }

      const item = rawItem as Record<string, unknown>;

      return {
        description: this.requireString(
          item,
          'description',
          `items[${index}].description`,
        ),
        quantity: this.requireNumber(
          item,
          'quantity',
          `items[${index}].quantity`,
        ),
        unitPrice: this.requireNumber(
          item,
          'unitPrice',
          `items[${index}].unitPrice`,
        ),
        amount: this.requireNumber(
          item,
          'amount',
          `items[${index}].amount`,
        ),
      };
    });
  }

  private requireString(
    data: Record<string, unknown>,
    field: string,
    label = field,
  ): string {
    const value = data[field];

    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(
        `Invalid or missing field "${label}": expected a non-empty string.`,
      );
    }

    return value.trim();
  }

  private requireNumber(
    data: Record<string, unknown>,
    field: string,
    label = field,
  ): number {
    const value = data[field];

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(
        `Invalid or missing field "${label}": expected a number.`,
      );
    }

    return value;
  }
}
