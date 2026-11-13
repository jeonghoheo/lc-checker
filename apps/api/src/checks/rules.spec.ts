import { CheckContext, evaluateRules, rule1, rule2, rule3, rule4, rule5, rule6, rule7, rule8 } from './rules.js';

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
    '6000 PCS OF PLASTIC COSMETIC JARS 50ML AND 4000 PCS OF AIRLESS PUMP BOTTLES 30ML',
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
  consignee: 'NORDLYS COSMETICS GMBH',
  notifyParty: 'NORDLYS COSMETICS GMBH',
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

function baseContext(presentationDate = '2026-12-10'): CheckContext {
  return {
    presentationDate,
    lc: { ...lc },
    invoice: { ...invoice, items: invoice.items.map((item) => ({ ...item })) },
    packingList: { ...packingList },
    billOfLading: { ...billOfLading },
    insurance: null,
  };
}

describe('rule 1 — latest shipment date', () => {
  it('passes when shipped on board is on or before the LC deadline', () => {
    expect(rule1(baseContext()).status).toBe('PASS');
  });

  it('fails when shipped on board is after the LC deadline', () => {
    const context = baseContext();
    context.billOfLading = {
      ...context.billOfLading!,
      shippedOnBoardDate: '2026-12-02',
    };

    const result = rule1(context);

    expect(result.status).toBe('FAIL');
    expect(result.detail).toMatchObject({
      compared: {
        shippedOnBoardDate: '2026-12-02',
        latestShipmentDate: '2026-11-30',
      },
    });
  });
});

describe('rule 2 — 21-day presentation period', () => {
  it('passes when presentation is within the allowed days', () => {
    expect(rule2(baseContext()).status).toBe('PASS');
  });

  it('fails when presentation is after the allowed days', () => {
    expect(rule2(baseContext('2026-12-25')).status).toBe('FAIL');
  });
});

describe('rule 3 — LC expiry', () => {
  it('passes when presentation is before LC expiry', () => {
    expect(rule3(baseContext()).status).toBe('PASS');
  });

  it('fails when presentation is after LC expiry', () => {
    expect(rule3(baseContext('2027-01-20')).status).toBe('FAIL');
  });
});

describe('rule 4 — insurance date', () => {
  it('is skipped until Block 7 implements it', () => {
    expect(rule4()).toMatchObject({
      ruleNo: 4,
      status: 'SKIPPED',
      detail: { reason: 'not implemented yet' },
    });
  });
});

describe('rule 5 — invoice amount and currency', () => {
  it('passes when the invoice does not exceed the LC amount', () => {
    expect(rule5(baseContext()).status).toBe('PASS');
  });

  it('fails when the invoice exceeds the LC amount', () => {
    const context = baseContext();
    context.invoice = { ...context.invoice!, totalAmount: 48500 };

    expect(rule5(context).status).toBe('FAIL');
  });
});

describe('rule 6 — gross weight', () => {
  it('passes when packing list and B/L gross weights match', () => {
    expect(rule6(baseContext()).status).toBe('PASS');
  });

  it('fails when packing list and B/L gross weights differ', () => {
    const context = baseContext();
    context.billOfLading = {
      ...context.billOfLading!,
      totalGrossWeightKg: 1210,
    };

    expect(rule6(context).status).toBe('FAIL');
  });
});

describe('rule 7 — quantity', () => {
  it('passes when invoice and packing list quantities match', () => {
    expect(rule7(baseContext()).status).toBe('PASS');
  });

  it('fails when invoice and packing list quantities differ', () => {
    const context = baseContext();
    context.packingList = { ...context.packingList!, totalQuantity: 9600 };

    expect(rule7(context).status).toBe('FAIL');
  });
});

describe('rule 8 — carton count', () => {
  it('passes when packing list and B/L carton counts match', () => {
    expect(rule8(baseContext()).status).toBe('PASS');
  });

  it('fails when packing list and B/L carton counts differ', () => {
    const context = baseContext();
    context.billOfLading = {
      ...context.billOfLading!,
      totalCartons: 480,
    };

    expect(rule8(context).status).toBe('FAIL');
  });
});

describe('evaluateRules', () => {
  it('returns all 15 rule results and skips rules 4 and 9-15', () => {
    const results = evaluateRules(baseContext());

    expect(results.map((result) => result.ruleNo)).toEqual(
      Array.from({ length: 15 }, (_, index) => index + 1),
    );
    expect(
      results
        .filter((result) => result.status === 'SKIPPED')
        .map((result) => result.ruleNo),
    ).toEqual([4, 9, 10, 11, 12, 13, 14, 15]);
  });
});
