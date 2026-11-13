import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { LcParserService, ParsedLc } from './lc-parser.service.js';

describe('LcParserService', () => {
  const service = new LcParserService();
  let parsed: ParsedLc;

  beforeAll(async () => {
    const samplePath = join(
      process.cwd(),
      '..',
      '..',
      'samples',
      'set-a',
      'lc-mt700.txt',
    );
    const text = await readFile(samplePath, 'utf8');
    parsed = service.parse(text);
  });

  it('parses every supported field from the set A LC', () => {
    expect(parsed).toEqual({
      creditNumber: 'HNBC-260781-KR',
      issueDate: '2026-10-20',
      expiryDate: '2027-01-15',
      expiryPlace: 'HAMBURG, GERMANY',
      applicant: [
        'NORDLYS COSMETICS GMBH',
        'SPEICHERSTADT 12',
        '20457 HAMBURG, GERMANY',
      ].join('\n'),
      beneficiary: [
        'HANBYEOL PACKAGING CO., LTD.',
        '123 PACKAGING-RO, ASAN-SI',
        'CHUNGCHEONGNAM-DO, REPUBLIC OF KOREA',
      ].join('\n'),
      currency: 'USD',
      amount: 48000,
      tolerance: '00/00',
      portOfLoading: 'BUSAN PORT, REPUBLIC OF KOREA',
      portOfDischarge: 'HAMBURG PORT, GERMANY',
      latestShipmentDate: '2026-11-30',
      goodsDescription: [
        '6000 PCS OF PLASTIC COSMETIC JARS 50ML',
        'AND 4000 PCS OF AIRLESS PUMP BOTTLES 30ML',
        'AS PER PROFORMA INVOICE NO. HB-PI-2026-017 DATED 10 OCTOBER 2026',
        'TRADE TERMS: CIF HAMBURG PORT, GERMANY (INCOTERMS 2020)',
      ].join('\n'),
      documentsRequired: [
        '1. SIGNED COMMERCIAL INVOICE IN 3 COPIES INDICATING L/C NO. HNBC-260781-KR.',
        '2. PACKING LIST IN 3 COPIES INDICATING GROSS AND NET WEIGHTS AND NUMBER OF CARTONS.',
        '3. FULL SET (3/3) OF CLEAN ON BOARD OCEAN BILLS OF LADING CONSIGNED TO',
        '   NORDLYS COSMETICS GMBH, NOTIFY PARTY NORDLYS COSMETICS GMBH,',
        '   SPEICHERSTADT 12, 20457 HAMBURG, GERMANY, MARKED FREIGHT PREPAID AND',
        '   EVIDENCING SHIPMENT FROM BUSAN PORT, REPUBLIC OF KOREA TO HAMBURG',
        '   PORT, GERMANY.',
      ].join('\n'),
      presentationDays: 21,
    });
  });
});
