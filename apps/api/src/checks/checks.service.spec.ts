import { AiExtractionService } from '../document-sets/ai-extraction.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AiReviewService } from './ai-review.service.js';
import { ChecksService } from './checks.service.js';

type FixtureDocument = {
  docType: string;
  extractedData: Record<string, unknown>;
};

type StoredResult = {
  checkRunId: string;
  ruleNo: number;
  status: string;
  detail: unknown;
};

type StoredRun = {
  id: string;
  documentSetId: string;
  createdAt: Date;
  results: StoredResult[];
};

type CreateArgs = {
  data: {
    documentSetId: string;
    results: {
      create: Array<{ ruleNo: number; status: string; detail: unknown }>;
    };
  };
};

type UpdateArgs = {
  where: {
    checkRunId_ruleNo: { checkRunId: string; ruleNo: number };
  };
  data: { detail: unknown };
};

const lc = {
  creditNumber: 'HNBC-260781-KR',
  issueDate: '2026-10-20',
  expiryDate: '2027-01-15',
  expiryPlace: 'HAMBURG, GERMANY',
  applicant:
    'NORDLYS COSMETICS GMBH\nSPEICHERSTADT 12\n20457 HAMBURG, GERMANY',
  beneficiary:
    'HANBYEOL PACKAGING CO., LTD.\n123 PACKAGING-RO, ASAN-SI\nCHUNGCHEONGNAM-DO, REPUBLIC OF KOREA',
  currency: 'USD',
  amount: 48000,
  tolerance: '00/00',
  portOfLoading: 'BUSAN PORT, REPUBLIC OF KOREA',
  portOfDischarge: 'HAMBURG PORT, GERMANY',
  latestShipmentDate: '2026-11-30',
  goodsDescription:
    '6000 PCS OF PLASTIC COSMETIC JARS 50ML AND 4000 PCS OF AIRLESS PUMP BOTTLES 30ML AS PER PROFORMA INVOICE NO. HB-PI-2026-017 DATED 10 OCTOBER 2026 TRADE TERMS: CIF HAMBURG PORT, GERMANY (INCOTERMS 2020)',
  documentsRequired:
    '1. SIGNED COMMERCIAL INVOICE.\n2. PACKING LIST.\n3. BILL OF LADING.',
  presentationDays: 21,
};

const invoice = {
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

const packingList = {
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

const billOfLading = {
  blNumber: 'HB-BL-2026-041',
  shipper: 'HANBYEOL PACKAGING CO., LTD.',
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
  goodsDescription: 'PLASTIC COSMETIC JARS 50ML',
  freightPrepaid: true,
  cleanOnBoard: false,
};

function makeSet(documents: FixtureDocument[]) {
  return {
    presentationDate: new Date('2026-12-10T00:00:00.000Z'),
    documents,
  };
}

function createPrismaFake(set: unknown) {
  let run: StoredRun | undefined;
  const updates: Array<{ ruleNo: number; detail: Record<string, unknown> }> =
    [];
  const prisma = {
    documentSet: {
      findUnique: vi.fn(async () => set),
    },
    checkRun: {
      create: vi.fn(async (args: CreateArgs) => {
        run = {
          id: 'run-1',
          documentSetId: args.data.documentSetId,
          createdAt: new Date(),
          results: args.data.results.create.map((result) => ({
            checkRunId: 'run-1',
            ruleNo: result.ruleNo,
            status: result.status,
            detail: result.detail,
          })),
        };

        return run;
      }),
    },
    checkResult: {
      update: vi.fn(async (args: UpdateArgs) => {
        const result = run!.results.find(
          (candidate) =>
            candidate.ruleNo === args.where.checkRunId_ruleNo.ruleNo,
        )!;
        result.detail = args.data.detail;
        updates.push({
          ruleNo: result.ruleNo,
          detail: args.data.detail as Record<string, unknown>,
        });
        return result;
      }),
    },
  };

  return { prisma, updates };
}

function createAiReviewService(extractJson: ReturnType<typeof vi.fn>) {
  const aiReviewService = new AiReviewService({
    extractJson,
  } as unknown as AiExtractionService);

  return aiReviewService;
}

describe('ChecksService AI review', () => {
  it('stores a discrepancy verdict for a rule 9 FAIL', async () => {
    const invoiceMissingAirless = {
      ...invoice,
      items: [
        { ...invoice.items[0] },
        { ...invoice.items[1], description: 'Pump bottles 30ml' },
      ],
    };
    const { prisma, updates } = createPrismaFake(
      makeSet([
        { docType: 'LC', extractedData: lc },
        { docType: 'INVOICE', extractedData: invoiceMissingAirless },
        { docType: 'PACKING_LIST', extractedData: packingList },
        { docType: 'BILL_OF_LADING', extractedData: billOfLading },
      ]),
    );
    const extractJson = vi.fn().mockResolvedValue({
      verdict: 'discrepancy',
      reason: 'The invoice omits the Airless product word.',
    });
    const aiReviewService = createAiReviewService(extractJson);
    const service = new ChecksService(
      prisma as unknown as PrismaService,
      aiReviewService,
    );

    const run = await service.runCheck('set-1');
    const rule9 = run.results.find((result) => result.ruleNo === 9)!;
    const detail = rule9.detail as {
      aiReview?: { verdict: string; reason: string };
    };

    expect(rule9.status).toBe('FAIL');
    expect(detail.aiReview).toEqual({
      verdict: 'discrepancy',
      reason: 'The invoice omits the Airless product word.',
    });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      ruleNo: 9,
      detail: { aiReview: { verdict: 'discrepancy' } },
    });
  });

  it('stores a likely_typo verdict for a rule 11 FAIL', async () => {
    const { prisma, updates } = createPrismaFake(
      makeSet([
        { docType: 'LC', extractedData: lc },
        { docType: 'INVOICE', extractedData: invoice },
        { docType: 'PACKING_LIST', extractedData: packingList },
        {
          docType: 'BILL_OF_LADING',
          extractedData: {
            ...billOfLading,
            consignee:
              'NORDLYS COSMETIC GMBH\nSPEICHERSTADT 12, 20457 HAMBURG, GERMANY',
          },
        },
      ]),
    );
    const extractJson = vi.fn().mockResolvedValue({
      verdict: 'likely_typo',
      reason: 'The names differ by one letter.',
    });
    const aiReviewService = createAiReviewService(extractJson);
    const service = new ChecksService(
      prisma as unknown as PrismaService,
      aiReviewService,
    );

    const run = await service.runCheck('set-1');
    const rule11 = run.results.find((result) => result.ruleNo === 11)!;
    const detail = rule11.detail as {
      aiReview?: { verdict: string; reason: string };
    };

    expect(rule11.status).toBe('FAIL');
    expect(detail.aiReview).toEqual({
      verdict: 'likely_typo',
      reason: 'The names differ by one letter.',
    });
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      ruleNo: 11,
      detail: { aiReview: { verdict: 'likely_typo' } },
    });
  });

  it('completes the check without aiReview when the AI client fails', async () => {
    const invoiceMissingAirless = {
      ...invoice,
      items: [
        { ...invoice.items[0] },
        { ...invoice.items[1], description: 'Pump bottles 30ml' },
      ],
    };
    const { prisma, updates } = createPrismaFake(
      makeSet([
        { docType: 'LC', extractedData: lc },
        { docType: 'INVOICE', extractedData: invoiceMissingAirless },
        { docType: 'PACKING_LIST', extractedData: packingList },
        { docType: 'BILL_OF_LADING', extractedData: billOfLading },
      ]),
    );
    const extractJson = vi
      .fn()
      .mockRejectedValue(new Error('DEEPSEEK_API_KEY is not set.'));
    const aiReviewService = createAiReviewService(extractJson);
    const service = new ChecksService(
      prisma as unknown as PrismaService,
      aiReviewService,
    );

    const run = await service.runCheck('set-1');
    const rule9 = run.results.find((result) => result.ruleNo === 9)!;
    const detail = rule9.detail as { aiReview?: unknown };

    expect(run.results).toHaveLength(15);
    expect(rule9.status).toBe('FAIL');
    expect(detail.aiReview).toBeUndefined();
    expect(updates).toHaveLength(0);
  });
});
