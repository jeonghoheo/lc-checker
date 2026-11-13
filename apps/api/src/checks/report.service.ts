import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

const RULE_NAMES: Record<number, string> = {
  1: '선적 마감일',
  2: '제시 기한 (21일)',
  3: '신용장 만료일',
  4: '보험 날짜',
  5: '송장 금액 한도',
  6: '총중량 일치',
  7: '수량 일치',
  8: '상자 수 일치',
  9: '물품 설명 대응',
  10: '항구 일치',
  11: '수하인 일치',
  12: '통지처 일치',
  13: '요구 서류 구비',
  14: '본선적재 표기',
  15: '배서 (이번 버전 검사 제외)',
};

const AI_VERDICT_LABELS: Record<string, string> = {
  corresponds: '같은 물품으로 보임',
  discrepancy: '실제로 다름',
  likely_typo: '오타로 보임',
  different: '다른 회사로 보임',
  unsure: '판단 보류',
};

const HONESTY_NOTICE =
  '이 보고서는 은행에 서류를 내기 전에 미리 점검한 결과입니다. 은행의 최종 판정을 보장하지 않습니다.';

type StoredResult = {
  ruleNo: number;
  status: string;
  detail: Prisma.JsonValue;
};

type ReportInput = {
  setId: string;
  lcNumber: string;
  presentationDate: string;
  results: StoredResult[];
};

type Comparison = {
  leftHeader: string;
  rightHeader: string;
  leftName: string;
  leftValue: string;
  rightName: string;
  rightValue: string;
};

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(setId: string) {
    const set = await this.prisma.documentSet.findUnique({
      where: { id: setId },
      include: {
        documents: true,
        checkRuns: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { results: { orderBy: { ruleNo: 'asc' } } },
        },
      },
    });

    if (!set) {
      throw new NotFoundException(`Document set ${setId} not found`);
    }

    const run = set.checkRuns[0];

    if (!run) {
      throw new BadRequestException(
        'No check run found for this document set. Run a check first.',
      );
    }

    const lcDocument = set.documents.find(
      (document) => document.docType === 'LC',
    );
    const html = this.render({
      setId,
      lcNumber: extractLcNumber(lcDocument?.extractedData ?? null),
      presentationDate: set.presentationDate
        ? set.presentationDate.toISOString().slice(0, 10)
        : '설정 안 됨',
      results: run.results,
    });

    return {
      filename: `lc-report-${setId}.html`,
      html,
    };
  }

  private render(input: ReportInput): string {
    const failed = input.results.filter((result) => result.status === 'FAIL');
    const skipped = input.results.filter(
      (result) => result.status === 'SKIPPED',
    );
    const passed = input.results.filter((result) => result.status === 'PASS');

    return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>신용장 서류 미리 점검 보고서</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 24px; color: #222; }
  h1 { font-size: 1.5rem; margin-bottom: 16px; }
  h2 { font-size: 1.15rem; margin: 28px 0 10px; }
  .meta { border: 1px solid #ccc; padding: 10px 12px; margin-bottom: 16px; }
  .meta p { margin: 4px 0; }
  .summary { font-weight: 700; font-size: 1.05rem; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th, td { border: 1px solid #bbb; padding: 8px; vertical-align: top; text-align: left; }
  th { background: #f2f2f2; }
  .compare { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .compare-box { border: 1px solid #ddd; padding: 6px; }
  .compare-header { font-size: 0.8rem; color: #666; }
  .compare-name { font-weight: 700; font-size: 0.85rem; margin: 3px 0; }
  .compare-value { white-space: pre-wrap; word-break: break-word; }
  .message { margin: 0; }
  .ai-note { background: #f3f6ff; border-left: 3px solid #5c6bc0; padding: 6px 8px; margin-top: 8px; }
  .pass-list { margin: 0; padding-left: 20px; }
  .pass-list li { margin: 2px 0; }
  .notice { margin-top: 28px; padding-top: 12px; border-top: 1px solid #888; font-weight: 600; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
<h1>신용장 서류 미리 점검 보고서</h1>
<div class="meta">
  <p>신용장 번호: ${escapeHtml(input.lcNumber)}</p>
  <p>제시일: ${escapeHtml(input.presentationDate)}</p>
  <p class="summary">요약: 통과 ${passed.length}개 · 불일치 ${failed.length}개 · 검사 못함 ${skipped.length}개</p>
</div>
<h2>불일치 ${failed.length}개</h2>
${this.renderFailedTable(failed)}
<h2>검사 못함 ${skipped.length}개</h2>
${this.renderSkippedTable(skipped)}
<h2>통과 ${passed.length}개</h2>
${this.renderPassedList(passed)}
<p class="notice">${HONESTY_NOTICE}</p>
</body>
</html>`;
  }

  private renderFailedTable(results: StoredResult[]): string {
    if (results.length === 0) {
      return '<p>불일치가 없습니다.</p>';
    }

    const rows = results
      .map((result) => {
        const detail = asDetail(result.detail);
        const comparison = buildComparison(result.ruleNo, detail);
        const message =
          typeof detail.message === 'string' ? detail.message : '';

        return `<tr>
  <td>${escapeHtml(ruleName(result.ruleNo))}</td>
  <td>${comparison ? renderComparison(comparison) : '—'}</td>
  <td><p class="message">${escapeHtml(message)}</p>${renderAiNote(detail)}</td>
</tr>`;
      })
      .join('\n');

    return `<table>
<thead><tr><th>규칙</th><th>비교 값</th><th>결과 내용</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`;
  }

  private renderSkippedTable(results: StoredResult[]): string {
    if (results.length === 0) {
      return '<p>검사 못한 항목이 없습니다.</p>';
    }

    const rows = results
      .map((result) => {
        const detail = asDetail(result.detail);
        const reason =
          typeof detail.reason === 'string' ? detail.reason : '이유 없음';

        return `<tr><td>${escapeHtml(ruleName(result.ruleNo))}</td><td>${escapeHtml(reason)}</td></tr>`;
      })
      .join('\n');

    return `<table>
<thead><tr><th>규칙</th><th>검사 못한 이유</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`;
  }

  private renderPassedList(results: StoredResult[]): string {
    if (results.length === 0) {
      return '<p>통과한 검사가 없습니다.</p>';
    }

    const items = results
      .map((result) => `<li>${escapeHtml(ruleName(result.ruleNo))}</li>`)
      .join('\n');

    return `<ul class="pass-list">
${items}
</ul>`;
  }
}

function ruleName(ruleNo: number) {
  return RULE_NAMES[ruleNo] ?? `검사 ${ruleNo}`;
}

function extractLcNumber(extractedData: Prisma.JsonValue | null): string {
  if (!isRecord(extractedData)) {
    return '확인 불가';
  }

  return typeof extractedData.creditNumber === 'string' &&
    extractedData.creditNumber
    ? extractedData.creditNumber
    : '확인 불가';
}

function asDetail(value: Prisma.JsonValue): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(' / ') || '—';
  }

  return JSON.stringify(value, null, 2) ?? '—';
}

function detailLabel(
  detail: Record<string, unknown>,
  side: 'left' | 'right',
  fallback: string,
) {
  const labels = isRecord(detail.labels) ? detail.labels : null;
  const label = labels?.[side];
  return typeof label === 'string' && label ? label : fallback;
}

function buildComparison(
  ruleNo: number,
  detail: Record<string, unknown>,
): Comparison | null {
  const compared = isRecord(detail.compared) ? detail.compared : null;

  if (!compared) {
    return null;
  }

  const pair = (
    leftName: string,
    leftValue: unknown,
    rightName: string,
    rightValue: unknown,
  ): Comparison => ({
    leftHeader: detailLabel(detail, 'left', '신용장·기준 값'),
    rightHeader: detailLabel(detail, 'right', '서류 값'),
    leftName,
    leftValue: formatValue(leftValue),
    rightName,
    rightValue: formatValue(rightValue),
  });

  switch (ruleNo) {
    case 1:
      return pair(
        '신용장 선적 마감일',
        compared.latestShipmentDate,
        '선하증권 본선적재일',
        compared.shippedOnBoardDate,
      );
    case 2:
      return pair(
        '신용장 제시 기한',
        `${formatValue(compared.presentationDays)}일`,
        '제시까지 걸린 날',
        `${formatValue(compared.days)}일`,
      );
    case 3:
      return pair(
        '신용장 만료일',
        compared.expiryDate,
        '제시일',
        compared.presentationDate,
      );
    case 4:
      return pair(
        '선적일',
        compared.shipmentDate,
        '보험 발행일',
        compared.insuranceIssueDate,
      );
    case 5: {
      const lcAmount = `${formatValue(compared.lcCurrency)} ${formatValue(compared.lcAmount)}`;
      const maxAmount =
        compared.maxAmount === undefined
          ? ''
          : ` (한도 ${formatValue(compared.maxAmount)})`;
      const invoiceAmount = `${formatValue(compared.invoiceCurrency)} ${formatValue(compared.invoiceTotalAmount)}`;

      return pair(
        '신용장 금액',
        `${lcAmount}${maxAmount}`,
        '송장 금액',
        invoiceAmount,
      );
    }
    case 6:
      return pair(
        '포장명세서 총중량',
        `${formatValue(compared.packingListTotalGrossWeightKg)} kg`,
        '선하증권 총중량',
        `${formatValue(compared.billOfLadingTotalGrossWeightKg)} kg`,
      );
    case 7:
      return pair(
        '송장 수량',
        compared.invoiceTotalQuantity,
        '포장명세서 수량',
        compared.packingListTotalQuantity,
      );
    case 8:
      return pair(
        '포장명세서 상자 수',
        compared.packingListTotalCartons,
        '선하증권 상자 수',
        compared.billOfLadingTotalCartons,
      );
    case 9:
      return pair(
        '신용장 물품 설명',
        compared.goodsDescription,
        '송장 물품 설명',
        compared.invoiceItemDescriptions,
      );
    case 10:
      return pair(
        '신용장 항구',
        `선적: ${formatValue(compared.lcPortOfLoading)}\n하적: ${formatValue(compared.lcPortOfDischarge)}`,
        '선하증권 항구',
        `선적: ${formatValue(compared.billOfLadingPortOfLoading)}\n하적: ${formatValue(compared.billOfLadingPortOfDischarge)}`,
      );
    case 11:
      return pair(
        '신용장 신청인',
        compared.lcApplicant,
        '선하증권 수하인',
        compared.billOfLadingConsignee,
      );
    case 12:
      return pair(
        '신용장 신청인',
        compared.lcApplicant,
        '선하증권 통지처',
        compared.billOfLadingNotifyParty,
      );
    case 13:
      return pair(
        '신용장 요구 서류',
        compared.requiredTypes,
        '빠진 서류',
        compared.missingTypes,
      );
    case 14:
      return pair(
        '필요한 표기',
        '본선적재 표기 있음',
        '선하증권 표기',
        '표기 없음',
      );
    default:
      return null;
  }
}

function renderComparison(comparison: Comparison): string {
  return `<div class="compare">
  <div class="compare-box">
    <div class="compare-header">${escapeHtml(comparison.leftHeader)}</div>
    <div class="compare-name">${escapeHtml(comparison.leftName)}</div>
    <div class="compare-value">${escapeHtml(comparison.leftValue)}</div>
  </div>
  <div class="compare-box">
    <div class="compare-header">${escapeHtml(comparison.rightHeader)}</div>
    <div class="compare-name">${escapeHtml(comparison.rightName)}</div>
    <div class="compare-value">${escapeHtml(comparison.rightValue)}</div>
  </div>
</div>`;
}

function renderAiNote(detail: Record<string, unknown>): string {
  const review = isRecord(detail.aiReview) ? detail.aiReview : null;

  if (!review) {
    return '';
  }

  const verdict =
    typeof review.verdict === 'string'
      ? AI_VERDICT_LABELS[review.verdict] ?? review.verdict
      : '판단 보류';
  const reason = typeof review.reason === 'string' ? review.reason : '';

  return `<div class="ai-note"><strong>AI 참고 의견:</strong> ${escapeHtml(verdict)}${reason ? ` — ${escapeHtml(reason)}` : ''}</div>`;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      (
        {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        } as Record<string, string>
      )[character]!,
  );
}
