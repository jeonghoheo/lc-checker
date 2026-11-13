import { ExtractedBillOfLading } from '../document-sets/bill-of-lading-extraction.service.js';
import { ExtractedInsurance } from '../document-sets/insurance-extraction.service.js';
import { ExtractedInvoice } from '../document-sets/invoice-extraction.service.js';
import { ParsedLc } from '../document-sets/lc-parser.service.js';
import { ExtractedPackingList } from '../document-sets/packing-list-extraction.service.js';

export type RuleStatus = 'PASS' | 'FAIL' | 'SKIPPED';

export type RuleResult = {
  ruleNo: number;
  status: RuleStatus;
  detail: Record<string, unknown>;
};

export type CheckContext = {
  presentationDate: string | null;
  lc: ParsedLc | null;
  invoice: ExtractedInvoice | null;
  packingList: ExtractedPackingList | null;
  billOfLading: ExtractedBillOfLading | null;
  insurance: ExtractedInsurance | null;
  uploadedDocTypes: string[];
};

function pass(
  ruleNo: number,
  compared: Record<string, unknown>,
): RuleResult {
  return { ruleNo, status: 'PASS', detail: { compared } };
}

function fail(
  ruleNo: number,
  message: string,
  compared: Record<string, unknown>,
): RuleResult {
  return { ruleNo, status: 'FAIL', detail: { message, compared } };
}

function skip(ruleNo: number, reason: string): RuleResult {
  return { ruleNo, status: 'SKIPPED', detail: { reason } };
}

function daysBetween(from: string, to: string): number {
  const fromTime = Date.parse(`${from}T00:00:00.000Z`);
  const toTime = Date.parse(`${to}T00:00:00.000Z`);

  return Math.round((toTime - fromTime) / 86_400_000);
}

function parseTolerancePercent(value: string): number | null {
  const match = value.match(/^\s*(\d+(?:[.,]\d+)?)/);

  if (!match) {
    return null;
  }

  const percent = Number(match[1].replace(',', '.'));
  return Number.isFinite(percent) ? percent : null;
}

function firstWord(value: string): string {
  return value.trim().split(/\s+/)[0] ?? '';
}

function normalizeName(value: string): string {
  const firstLine = value.split(/\r?\n/)[0] ?? '';
  const beforeComma = firstLine.split(',')[0] ?? '';

  return beforeComma.toUpperCase().replace(/\s+/g, ' ').trim();
}

function significantGoodsWords(goodsDescription: string): string[] {
  const productDescription = goodsDescription.split(
    /\b(?:AS PER|TRADE TERMS)\b/i,
  )[0]!;
  const excluded = new Set(['AND', 'WITH', 'FROM', 'ONLY', 'GOODS']);
  const words = productDescription.toUpperCase().match(/[A-Z0-9]+/g) ?? [];

  return [
    ...new Set(
      words.filter(
        (word) =>
          word.length >= 4 && /[A-Z]/.test(word) && !excluded.has(word),
      ),
    ),
  ];
}

export function rule1(context: CheckContext): RuleResult {
  if (!context.lc) {
    return skip(1, 'LC document is missing');
  }

  if (!context.lc.latestShipmentDate) {
    return skip(1, 'LC latestShipmentDate is missing');
  }

  if (!context.billOfLading) {
    return skip(1, 'bill of lading document is missing');
  }

  if (!context.billOfLading.shippedOnBoardDate) {
    return skip(1, 'bill of lading shippedOnBoardDate is missing');
  }

  const compared = {
    shippedOnBoardDate: context.billOfLading.shippedOnBoardDate,
    latestShipmentDate: context.lc.latestShipmentDate,
  };

  if (context.billOfLading.shippedOnBoardDate <= context.lc.latestShipmentDate) {
    return pass(1, compared);
  }

  return fail(
    1,
    `Shipped on board date ${context.billOfLading.shippedOnBoardDate} is after latest shipment date ${context.lc.latestShipmentDate}.`,
    compared,
  );
}

export function rule2(context: CheckContext): RuleResult {
  if (!context.presentationDate) {
    return skip(2, 'presentationDate is not set');
  }

  if (!context.lc) {
    return skip(2, 'LC document is missing');
  }

  if (context.lc.presentationDays == null) {
    return skip(2, 'LC presentationDays is missing');
  }

  if (!context.billOfLading) {
    return skip(2, 'bill of lading document is missing');
  }

  if (!context.billOfLading.shippedOnBoardDate) {
    return skip(2, 'bill of lading shippedOnBoardDate is missing');
  }

  const days = daysBetween(
    context.billOfLading.shippedOnBoardDate,
    context.presentationDate,
  );
  const compared = {
    presentationDate: context.presentationDate,
    shippedOnBoardDate: context.billOfLading.shippedOnBoardDate,
    days,
    presentationDays: context.lc.presentationDays,
  };

  if (days <= context.lc.presentationDays) {
    return pass(2, compared);
  }

  return fail(
    2,
    `Presentation is ${days} days after shipment, exceeding the ${context.lc.presentationDays}-day limit.`,
    compared,
  );
}

export function rule3(context: CheckContext): RuleResult {
  if (!context.presentationDate) {
    return skip(3, 'presentationDate is not set');
  }

  if (!context.lc) {
    return skip(3, 'LC document is missing');
  }

  if (!context.lc.expiryDate) {
    return skip(3, 'LC expiryDate is missing');
  }

  const compared = {
    presentationDate: context.presentationDate,
    expiryDate: context.lc.expiryDate,
  };

  if (context.presentationDate <= context.lc.expiryDate) {
    return pass(3, compared);
  }

  return fail(
    3,
    `Presentation date ${context.presentationDate} is after LC expiry date ${context.lc.expiryDate}.`,
    compared,
  );
}

export function rule4(context: CheckContext): RuleResult {
  if (!context.insurance) {
    return skip(4, 'insurance document is missing');
  }

  if (!context.billOfLading) {
    return skip(4, 'bill of lading document is missing');
  }

  if (!context.insurance.issueDate) {
    return skip(4, 'insurance issueDate is missing');
  }

  let shipmentDate = context.billOfLading.shippedOnBoardDate;
  let fallback: string | undefined;

  if (!shipmentDate) {
    shipmentDate = context.billOfLading.issueDate;
    fallback = 'blIssueDate';
  }

  if (!shipmentDate) {
    return skip(4, 'shipment date is unavailable');
  }

  const compared = {
    insuranceIssueDate: context.insurance.issueDate,
    shipmentDate,
    ...(fallback ? { fallback } : {}),
  };
  const detail: Record<string, unknown> = { compared };

  if (fallback) {
    detail.fallback = fallback;
  }

  if (context.insurance.issueDate <= shipmentDate) {
    return { ruleNo: 4, status: 'PASS', detail };
  }

  return {
    ruleNo: 4,
    status: 'FAIL',
    detail: {
      ...detail,
      message: `Insurance issue date ${context.insurance.issueDate} is after shipment date ${shipmentDate}.`,
    },
  };
}

export function rule5(context: CheckContext): RuleResult {
  if (!context.lc) {
    return skip(5, 'LC document is missing');
  }

  if (!context.invoice) {
    return skip(5, 'commercial invoice document is missing');
  }

  if (typeof context.lc.amount !== 'number' || !context.lc.currency) {
    return skip(5, 'LC amount or currency is missing');
  }

  if (
    typeof context.invoice.totalAmount !== 'number' ||
    !context.invoice.currency
  ) {
    return skip(5, 'invoice totalAmount or currency is missing');
  }

  if (!context.lc.tolerance) {
    return skip(5, 'LC tolerance is missing');
  }

  const tolerancePercent = parseTolerancePercent(context.lc.tolerance);

  if (tolerancePercent === null) {
    return skip(5, 'LC tolerance is invalid');
  }

  const maxAmount = context.lc.amount * (1 + tolerancePercent / 100);
  const amountPasses = context.invoice.totalAmount <= maxAmount + 0.001;
  const currencyPasses =
    context.invoice.currency.trim().toUpperCase() ===
    context.lc.currency.trim().toUpperCase();
  const compared = {
    invoiceTotalAmount: context.invoice.totalAmount,
    lcAmount: context.lc.amount,
    lcTolerance: context.lc.tolerance,
    maxAmount,
    invoiceCurrency: context.invoice.currency,
    lcCurrency: context.lc.currency,
  };

  if (amountPasses && currencyPasses) {
    return pass(5, compared);
  }

  const reasons: string[] = [];

  if (!amountPasses) {
    reasons.push(
      `Invoice total ${context.invoice.totalAmount} exceeds LC amount ${context.lc.amount} with ${tolerancePercent}% tolerance (maximum ${maxAmount}).`,
    );
  }

  if (!currencyPasses) {
    reasons.push(
      `Invoice currency ${context.invoice.currency} does not match LC currency ${context.lc.currency}.`,
    );
  }

  return fail(5, reasons.join(' '), compared);
}

export function rule6(context: CheckContext): RuleResult {
  if (!context.packingList) {
    return skip(6, 'packing list document is missing');
  }

  if (!context.billOfLading) {
    return skip(6, 'bill of lading document is missing');
  }

  if (
    typeof context.packingList.totalGrossWeightKg !== 'number' ||
    typeof context.billOfLading.totalGrossWeightKg !== 'number'
  ) {
    return skip(6, 'gross weight is missing');
  }

  const compared = {
    packingListTotalGrossWeightKg:
      context.packingList.totalGrossWeightKg,
    billOfLadingTotalGrossWeightKg:
      context.billOfLading.totalGrossWeightKg,
  };

  if (
    context.packingList.totalGrossWeightKg ===
    context.billOfLading.totalGrossWeightKg
  ) {
    return pass(6, compared);
  }

  return fail(
    6,
    `Packing list gross weight ${context.packingList.totalGrossWeightKg} kg does not match bill of lading gross weight ${context.billOfLading.totalGrossWeightKg} kg.`,
    compared,
  );
}

export function rule7(context: CheckContext): RuleResult {
  if (!context.invoice) {
    return skip(7, 'commercial invoice document is missing');
  }

  if (!context.packingList) {
    return skip(7, 'packing list document is missing');
  }

  if (
    typeof context.invoice.totalQuantity !== 'number' ||
    typeof context.packingList.totalQuantity !== 'number'
  ) {
    return skip(7, 'quantity is missing');
  }

  const compared = {
    invoiceTotalQuantity: context.invoice.totalQuantity,
    packingListTotalQuantity: context.packingList.totalQuantity,
  };

  if (context.invoice.totalQuantity === context.packingList.totalQuantity) {
    return pass(7, compared);
  }

  return fail(
    7,
    `Invoice quantity ${context.invoice.totalQuantity} does not match packing list quantity ${context.packingList.totalQuantity}.`,
    compared,
  );
}

export function rule8(context: CheckContext): RuleResult {
  if (!context.packingList) {
    return skip(8, 'packing list document is missing');
  }

  if (!context.billOfLading) {
    return skip(8, 'bill of lading document is missing');
  }

  if (
    typeof context.packingList.totalCartons !== 'number' ||
    typeof context.billOfLading.totalCartons !== 'number'
  ) {
    return skip(8, 'carton count is missing');
  }

  const compared = {
    packingListTotalCartons: context.packingList.totalCartons,
    billOfLadingTotalCartons: context.billOfLading.totalCartons,
  };

  if (
    context.packingList.totalCartons === context.billOfLading.totalCartons
  ) {
    return pass(8, compared);
  }

  return fail(
    8,
    `Packing list cartons ${context.packingList.totalCartons} do not match bill of lading cartons ${context.billOfLading.totalCartons}.`,
    compared,
  );
}

export function rule9(context: CheckContext): RuleResult {
  if (!context.lc) {
    return skip(9, 'LC document is missing');
  }

  if (!context.lc.goodsDescription) {
    return skip(9, 'LC goodsDescription is missing');
  }

  if (!context.invoice) {
    return skip(9, 'commercial invoice document is missing');
  }

  if (
    !Array.isArray(context.invoice.items) ||
    context.invoice.items.length === 0
  ) {
    return skip(9, 'invoice items are missing');
  }

  const significantWords = significantGoodsWords(context.lc.goodsDescription);
  const invoiceDescriptions = context.invoice.items
    .map((item) => item.description)
    .join(' ')
    .toUpperCase();
  const missingWords = significantWords.filter(
    (word) => !invoiceDescriptions.includes(word),
  );
  const compared = {
    goodsDescription: context.lc.goodsDescription,
    significantWords,
    invoiceItemDescriptions: context.invoice.items.map(
      (item) => item.description,
    ),
    missingWords,
  };

  if (missingWords.length === 0) {
    return pass(9, compared);
  }

  return fail(
    9,
    `Invoice item descriptions are missing LC goods words: ${missingWords.join(', ')}.`,
    compared,
  );
}

export function rule10(context: CheckContext): RuleResult {
  if (!context.lc) {
    return skip(10, 'LC document is missing');
  }

  if (!context.billOfLading) {
    return skip(10, 'bill of lading document is missing');
  }

  if (!context.lc.portOfLoading || !context.lc.portOfDischarge) {
    return skip(10, 'LC ports are missing');
  }

  if (
    !context.billOfLading.portOfLoading ||
    !context.billOfLading.portOfDischarge
  ) {
    return skip(10, 'bill of lading ports are missing');
  }

  const lcLoadingWord = firstWord(context.lc.portOfLoading);
  const lcDischargeWord = firstWord(context.lc.portOfDischarge);

  if (!lcLoadingWord || !lcDischargeWord) {
    return skip(10, 'LC ports are missing');
  }

  const loadingPasses = context.billOfLading.portOfLoading
    .toUpperCase()
    .includes(lcLoadingWord.toUpperCase());
  const dischargePasses = context.billOfLading.portOfDischarge
    .toUpperCase()
    .includes(lcDischargeWord.toUpperCase());
  const compared = {
    lcPortOfLoading: context.lc.portOfLoading,
    billOfLadingPortOfLoading: context.billOfLading.portOfLoading,
    lcPortOfDischarge: context.lc.portOfDischarge,
    billOfLadingPortOfDischarge: context.billOfLading.portOfDischarge,
  };

  if (loadingPasses && dischargePasses) {
    return pass(10, compared);
  }

  const messages: string[] = [];

  if (!loadingPasses) {
    messages.push(
      `Port of loading mismatch: LC "${context.lc.portOfLoading}" vs B/L "${context.billOfLading.portOfLoading}".`,
    );
  }

  if (!dischargePasses) {
    messages.push(
      `Port of discharge mismatch: LC "${context.lc.portOfDischarge}" vs B/L "${context.billOfLading.portOfDischarge}".`,
    );
  }

  return fail(10, messages.join(' '), compared);
}

export function rule11(context: CheckContext): RuleResult {
  if (!context.lc) {
    return skip(11, 'LC document is missing');
  }

  if (!context.lc.applicant) {
    return skip(11, 'LC applicant is missing');
  }

  if (!context.billOfLading) {
    return skip(11, 'bill of lading document is missing');
  }

  if (!context.billOfLading.consignee) {
    return skip(11, 'bill of lading consignee is missing');
  }

  const lcName = normalizeName(context.lc.applicant);
  const blName = normalizeName(context.billOfLading.consignee);
  const compared = {
    billOfLadingConsignee: context.billOfLading.consignee,
    lcApplicant: context.lc.applicant,
    normalizedBillOfLadingConsignee: blName,
    normalizedLcApplicant: lcName,
  };

  if (blName === lcName) {
    return pass(11, compared);
  }

  return fail(
    11,
    `Bill of lading consignee "${context.billOfLading.consignee}" does not match LC applicant "${context.lc.applicant}".`,
    compared,
  );
}

export function rule12(context: CheckContext): RuleResult {
  if (!context.lc) {
    return skip(12, 'LC document is missing');
  }

  if (!context.lc.applicant) {
    return skip(12, 'LC applicant is missing');
  }

  if (!context.billOfLading) {
    return skip(12, 'bill of lading document is missing');
  }

  if (!context.billOfLading.notifyParty) {
    return skip(12, 'bill of lading notifyParty is missing');
  }

  const lcName = normalizeName(context.lc.applicant);
  const blName = normalizeName(context.billOfLading.notifyParty);
  const compared = {
    billOfLadingNotifyParty: context.billOfLading.notifyParty,
    lcApplicant: context.lc.applicant,
    normalizedBillOfLadingNotifyParty: blName,
    normalizedLcApplicant: lcName,
  };

  if (blName === lcName) {
    return pass(12, compared);
  }

  return fail(
    12,
    `Bill of lading notify party "${context.billOfLading.notifyParty}" does not match LC applicant "${context.lc.applicant}".`,
    compared,
  );
}

export function rule13(context: CheckContext): RuleResult {
  if (!context.lc) {
    return skip(13, 'LC document is missing');
  }

  if (!context.lc.documentsRequired) {
    return skip(13, 'LC documentsRequired is missing');
  }

  const requiredText = context.lc.documentsRequired.toUpperCase();
  const requiredTypes: string[] = [];

  if (requiredText.includes('CERTIFICATE OF ORIGIN')) {
    requiredTypes.push('ORIGIN_CERTIFICATE');
  }

  if (
    requiredText.includes('INSURANCE CERTIFICATE') ||
    requiredText.includes('INSURANCE POLICY')
  ) {
    requiredTypes.push('INSURANCE');
  }

  if (requiredText.includes('COMMERCIAL INVOICE')) {
    requiredTypes.push('INVOICE');
  }

  if (requiredText.includes('PACKING LIST')) {
    requiredTypes.push('PACKING_LIST');
  }

  if (
    requiredText.includes('BILL OF LADING') ||
    requiredText.includes('BILLS OF LADING')
  ) {
    requiredTypes.push('BILL_OF_LADING');
  }

  const uploadedTypes = new Set(context.uploadedDocTypes);
  const missingTypes = requiredTypes.filter(
    (requiredType) => !uploadedTypes.has(requiredType),
  );
  const compared = {
    requiredTypes,
    missingTypes,
    uploadedDocTypes: [...uploadedTypes],
  };

  if (missingTypes.length === 0) {
    return pass(13, compared);
  }

  return fail(
    13,
    `Required document types are not uploaded: ${missingTypes.join(', ')}.`,
    compared,
  );
}

export function rule14(context: CheckContext): RuleResult {
  if (!context.billOfLading) {
    return skip(14, 'bill of lading document is missing');
  }

  const compared = {
    shippedOnBoardDate: context.billOfLading.shippedOnBoardDate,
  };

  if (context.billOfLading.shippedOnBoardDate) {
    return pass(14, compared);
  }

  return fail(
    14,
    'Bill of lading has no on-board notation.',
    compared,
  );
}

export function rule15(): RuleResult {
  return skip(15, 'endorsement is not extracted in v1');
}

export function evaluateRules(context: CheckContext): RuleResult[] {
  return [
    rule1(context),
    rule2(context),
    rule3(context),
    rule4(context),
    rule5(context),
    rule6(context),
    rule7(context),
    rule8(context),
    rule9(context),
    rule10(context),
    rule11(context),
    rule12(context),
    rule13(context),
    rule14(context),
    rule15(),
  ];
}
