import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DetectedDocumentType, DocumentTypeService } from './document-type.service.js';

describe('DocumentTypeService', () => {
  const service = new DocumentTypeService();

  const cases: Array<{ file: string; expected: DetectedDocumentType }> = [
    { file: 'set-a/lc-mt700.txt', expected: 'LC' },
    { file: 'set-a/commercial-invoice.txt', expected: 'INVOICE' },
    { file: 'set-a/packing-list.txt', expected: 'PACKING_LIST' },
    { file: 'set-a/bill-of-lading.txt', expected: 'BILL_OF_LADING' },
    {
      file: 'set-c/insurance-certificate.txt',
      expected: 'INSURANCE',
    },
  ];

  it.each(cases)('detects $expected from $file', async ({ file, expected }) => {
    const samplePath = join(
      process.cwd(),
      '..',
      '..',
      'samples',
      ...file.split('/'),
    );
    const text = await readFile(samplePath, 'utf8');

    expect(service.detect(text)).toBe(expected);
  });
});
