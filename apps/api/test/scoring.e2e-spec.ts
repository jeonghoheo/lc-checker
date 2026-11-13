import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { LcParserService } from '../src/document-sets/lc-parser.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

type FixtureDocument = {
  docType: string;
  extractedData: Record<string, unknown>;
};

const invoiceBase = {
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

const packingListBase = {
  packingListNumber: 'HB-PL-2026-041',
  date: '2026-11-24',
  invoiceNumber: 'HB-INV-2026-041',
  lcNumber: 'HNBC-260781-KR',
  totalQuantity: 10000,
  totalCartons: 500,
  totalNetWeightKg: 1100,
  totalGrossWeightKg: 1250,
  vessel: 'MV NORTHERN EXPRESS V.064N',
};

const billOfLadingBase = {
  blNumber: 'HB-BL-2026-041',
  shipper:
    'HANBYEOL PACKAGING CO., LTD.\n123 PACKAGING-RO, ASAN-SI, CHUNGCHEONGNAM-DO, REPUBLIC OF KOREA',
  consignee:
    'NORDLYS COSMETICS GMBH\nSPEICHERSTADT 12, 20457 HAMBURG, GERMANY',
  notifyParty:
    'NORDLYS COSMETICS GMBH\nSPEICHERSTADT 12, 20457 HAMBURG, GERMANY',
  vessel: 'MV NORTHERN EXPRESS',
  voyage: 'V.064N',
  portOfLoading: 'BUSAN PORT, REPUBLIC OF KOREA',
  portOfDischarge: 'HAMBURG PORT, GERMANY',
  shippedOnBoardDate: '2026-11-25',
  issueDate: '2026-11-25',
  totalCartons: 500,
  totalGrossWeightKg: 1250,
  goodsDescription:
    'PLASTIC COSMETIC JARS 50ML AND AIRLESS PUMP BOTTLES 30ML',
  freightPrepaid: true,
  cleanOnBoard: false,
};

const insuranceFixture = {
  certificateNumber: 'MI-CERT-2026-1187',
  policyNumber: 'MI-POL-2026-0092',
  issueDate: '2026-11-28',
  assured:
    'Hanbyeol Packaging Co., Ltd.\n123 Packaging-ro, Asan-si, Chungcheongnam-do, Republic of Korea',
  currency: 'USD',
  sumInsured: 53350,
  voyageFrom: 'Busan Port, Republic of Korea',
  voyageTo: 'Hamburg Port, Germany',
};

describe('Scoring run (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let setA: FixtureDocument[];
  let setB: FixtureDocument[];
  let setC: FixtureDocument[];
  const createdSetIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const parser = new LcParserService();
    const lcA = parser.parse(
      await readFile(
        join(process.cwd(), '..', '..', 'samples', 'set-a', 'lc-mt700.txt'),
        'utf8',
      ),
    );
    const lcC = parser.parse(
      await readFile(
        join(process.cwd(), '..', '..', 'samples', 'set-c', 'lc-mt700.txt'),
        'utf8',
      ),
    );

    setA = [
      { docType: 'LC', extractedData: lcA },
      { docType: 'INVOICE', extractedData: invoiceBase },
      { docType: 'PACKING_LIST', extractedData: packingListBase },
      { docType: 'BILL_OF_LADING', extractedData: billOfLadingBase },
    ];

    setB = [
      { docType: 'LC', extractedData: lcA },
      {
        docType: 'INVOICE',
        extractedData: {
          ...invoiceBase,
          invoiceDate: '2026-12-01',
          items: [
            { ...invoiceBase.items[0] },
            {
              ...invoiceBase.items[1],
              description: 'Pump bottles 30ml',
            },
          ],
        },
      },
      {
        docType: 'PACKING_LIST',
        extractedData: { ...packingListBase, date: '2026-12-01' },
      },
      {
        docType: 'BILL_OF_LADING',
        extractedData: {
          ...billOfLadingBase,
          shipper:
            'HANBYEOL PACKAGING CO., LTD.\nREPUBLIC OF KOREA, CHUNGCHEONGNAM-DO, ASAN-SI, 123 PACKAGING-RO',
          notifyParty:
            'NORDLYS LOGISTICS GMBH\nAM SANDTORKAI 40, 20457 HAMBURG, GERMANY',
          shippedOnBoardDate: '2026-12-02',
          issueDate: '2026-12-02',
          totalCartons: 480,
          totalGrossWeightKg: 1210,
        },
      },
    ];

    setC = [
      { docType: 'LC', extractedData: lcC },
      {
        docType: 'INVOICE',
        extractedData: {
          ...invoiceBase,
          totalAmount: 48500,
          items: [
            { ...invoiceBase.items[0] },
            { ...invoiceBase.items[1] },
            {
              description: "Special pallet repacking charge (at buyer's request)",
              quantity: 0,
              unitPrice: 0,
              amount: 500,
            },
          ],
        },
      },
      {
        docType: 'PACKING_LIST',
        extractedData: {
          ...packingListBase,
          totalQuantity: 9600,
          descriptionOfGoods: 'COSMETIC CONTAINERS (PLASTIC)',
        },
      },
      {
        docType: 'BILL_OF_LADING',
        extractedData: {
          ...billOfLadingBase,
          portOfDischarge: 'ROTTERDAM PORT, NETHERLANDS',
          shippedOnBoardDate: null,
          issueDate: '2026-11-25',
        },
      },
      { docType: 'INSURANCE', extractedData: insuranceFixture },
    ];
  });

  afterAll(async () => {
    if (prisma && createdSetIds.length > 0) {
      await prisma.document.deleteMany({
        where: { setId: { in: createdSetIds } },
      });
      await prisma.documentSet.deleteMany({
        where: { id: { in: createdSetIds } },
      });
    }

    for (const setId of createdSetIds) {
      await rm(join(process.cwd(), 'uploads', setId), {
        recursive: true,
        force: true,
      });
    }

    await app?.close();
  });

  async function runScoringSet(
    presentationDate: string,
    documents: FixtureDocument[],
  ) {
    const create = await request(app.getHttpServer())
      .post('/document-sets')
      .expect(201);
    const setId = create.body.id as string;
    createdSetIds.push(setId);

    await request(app.getHttpServer())
      .patch(`/document-sets/${setId}/presentation-date`)
      .send({ presentationDate })
      .expect(200);

    await prisma.document.createMany({
      data: documents.map((document, index) => ({
        setId,
        originalName: `fixture-${document.docType}-${index}.txt`,
        storedPath: `fixtures/${document.docType}-${index}.txt`,
        mimeType: 'text/plain',
        sizeBytes: 0,
        docType: document.docType,
        extractedData: document.extractedData as Prisma.InputJsonValue,
      })),
    });

    const check = await request(app.getHttpServer())
      .post(`/document-sets/${setId}/check`)
      .expect(201);

    expect(check.body.results).toHaveLength(15);
    return check.body as {
      results: Array<{ ruleNo: number; status: string }>;
    };
  }

  function failedRules(run: { results: Array<{ ruleNo: number; status: string }> }) {
    return run.results
      .filter((result) => result.status === 'FAIL')
      .map((result) => result.ruleNo)
      .sort((left, right) => left - right);
  }

  it('set A is clean: no FAIL results', async () => {
    const run = await runScoringSet('2026-12-10', setA);

    expect(failedRules(run)).toEqual([]);
  });

  it('set B fails exactly rules 1, 2, 6, 8, 9, and 12', async () => {
    const run = await runScoringSet('2026-12-25', setB);

    expect(failedRules(run)).toEqual([1, 2, 6, 8, 9, 12]);
  });

  it('set C fails exactly rules 4, 5, 7, 10, 13, and 14', async () => {
    const run = await runScoringSet('2026-12-10', setC);

    expect(failedRules(run)).toEqual([4, 5, 7, 10, 13, 14]);
  });
});
