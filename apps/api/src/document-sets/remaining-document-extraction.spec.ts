import { AiExtractionService } from './ai-extraction.service.js';
import { BillOfLadingExtractionService } from './bill-of-lading-extraction.service.js';
import { InsuranceExtractionService } from './insurance-extraction.service.js';
import { PackingListExtractionService } from './packing-list-extraction.service.js';

function mockAi(value: unknown): AiExtractionService {
  return {
    extract: vi.fn().mockResolvedValue(value),
  } as unknown as AiExtractionService;
}

const packingListFixture = {
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

const billOfLadingFixture = {
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

describe('PackingListExtractionService', () => {
  it('returns the known packing list values from the AI fixture', async () => {
    const service = new PackingListExtractionService(
      mockAi(packingListFixture),
    );

    await expect(service.extract('packing list text')).resolves.toEqual(
      packingListFixture,
    );
  });
});

describe('BillOfLadingExtractionService', () => {
  it('returns the known bill of lading values from the AI fixture', async () => {
    const service = new BillOfLadingExtractionService(
      mockAi(billOfLadingFixture),
    );

    await expect(service.extract('bill of lading text')).resolves.toEqual(
      billOfLadingFixture,
    );
  });

  it('allows a null shipped-on-board date', async () => {
    const service = new BillOfLadingExtractionService(
      mockAi({ ...billOfLadingFixture, shippedOnBoardDate: null }),
    );

    const result = await service.extract('bill of lading text');

    expect(result.shippedOnBoardDate).toBeNull();
  });
});

describe('InsuranceExtractionService', () => {
  it('returns the known insurance values from the AI fixture', async () => {
    const service = new InsuranceExtractionService(mockAi(insuranceFixture));

    await expect(service.extract('insurance text')).resolves.toEqual(
      insuranceFixture,
    );
  });
});
