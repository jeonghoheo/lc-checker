import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AiExtractionService } from './ai-extraction.service.js';
import {
  ExtractedInvoice,
  InvoiceExtractionService,
} from './invoice-extraction.service.js';

const recordedResponse: ExtractedInvoice = {
  invoiceNumber: 'HB-INV-2026-041',
  invoiceDate: '2026-11-24',
  sellerName: 'Hanbyeol Packaging Co., Ltd.',
  buyerName: 'Nordlys Cosmetics GmbH',
  lcNumber: 'HNBC-260781-KR',
  currency: 'USD',
  totalAmount: 48000,
  totalQuantity: 10000,
  items: [
    {
      description: 'Plastic cosmetic jars 50ml',
      quantity: 6000,
      unitPrice: 4.2,
      amount: 25200,
    },
    {
      description: 'Airless pump bottles 30ml',
      quantity: 4000,
      unitPrice: 5.7,
      amount: 22800,
    },
  ],
};

describe('InvoiceExtractionService', () => {
  it('returns the invoice object to store from the recorded AI fixture', async () => {
    const extract = vi.fn().mockResolvedValue(recordedResponse);
    const aiExtractionService = {
      extract,
    } as unknown as AiExtractionService;
    const service = new InvoiceExtractionService(aiExtractionService);
    const samplePath = join(
      process.cwd(),
      '..',
      '..',
      'samples',
      'set-a',
      'commercial-invoice.txt',
    );
    const text = await readFile(samplePath, 'utf8');

    const result = await service.extract(text);

    expect(extract).toHaveBeenCalledOnce();
    expect(result).toEqual(recordedResponse);
    expect(result.items).toHaveLength(2);
  });

  it('rejects a fixture whose item amounts do not sum to totalAmount', async () => {
    const aiExtractionService = {
      extract: vi.fn().mockResolvedValue({
        ...recordedResponse,
        totalAmount: 48001,
      }),
    } as unknown as AiExtractionService;
    const service = new InvoiceExtractionService(aiExtractionService);

    await expect(service.extract('invoice text')).rejects.toThrow(
      /does not match totalAmount/,
    );
  });
});
