import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ExtractedBillOfLading } from '../document-sets/bill-of-lading-extraction.service.js';
import { ExtractedInsurance } from '../document-sets/insurance-extraction.service.js';
import { ExtractedInvoice } from '../document-sets/invoice-extraction.service.js';
import { ParsedLc } from '../document-sets/lc-parser.service.js';
import { ExtractedPackingList } from '../document-sets/packing-list-extraction.service.js';
import { AiReviewService } from './ai-review.service.js';
import { CheckContext, evaluateRules } from './rules.js';

type SetDocument = {
  docType: string | null;
  extractedData: Prisma.JsonValue | null;
};

type SetWithDocuments = {
  presentationDate: Date | null;
  documents: SetDocument[];
};

@Injectable()
export class ChecksService {
  private readonly logger = new Logger(ChecksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiReviewService: AiReviewService,
  ) {}

  async runCheck(setId: string) {
    const set = await this.prisma.documentSet.findUnique({
      where: { id: setId },
      include: { documents: true },
    });

    if (!set) {
      throw new NotFoundException(`Document set ${setId} not found`);
    }

    const results = evaluateRules(this.buildContext(set));
    const run = await this.prisma.checkRun.create({
      data: {
        documentSetId: setId,
        results: {
          create: results.map((result) => ({
            ruleNo: result.ruleNo,
            status: result.status,
            detail: result.detail as Prisma.InputJsonValue,
          })),
        },
      },
      include: { results: { orderBy: { ruleNo: 'asc' } } },
    });

    await this.applyAiReviews(run.results);

    return run;
  }

  private async applyAiReviews(
    results: Array<{
      checkRunId: string;
      ruleNo: number;
      status: string;
      detail: Prisma.JsonValue;
    }>,
  ) {
    for (const result of results) {
      if (
        result.status !== 'FAIL' ||
        ![9, 11, 12].includes(result.ruleNo)
      ) {
        continue;
      }

      try {
        const detail = result.detail as Record<string, unknown>;
        const aiReview = await this.aiReviewService.review(
          result.ruleNo,
          detail,
        );
        const updatedDetail = { ...detail, aiReview };

        await this.prisma.checkResult.update({
          where: {
            checkRunId_ruleNo: {
              checkRunId: result.checkRunId,
              ruleNo: result.ruleNo,
            },
          },
          data: { detail: updatedDetail as Prisma.InputJsonValue },
        });

        result.detail = updatedDetail as Prisma.JsonValue;
      } catch (error) {
        this.logger.warn(
          `AI review skipped for rule ${result.ruleNo}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }
  }

  private buildContext(set: SetWithDocuments): CheckContext {
    return {
      presentationDate: set.presentationDate
        ? set.presentationDate.toISOString().slice(0, 10)
        : null,
      lc: this.findExtractedData<ParsedLc>(set.documents, 'LC'),
      invoice: this.findExtractedData<ExtractedInvoice>(
        set.documents,
        'INVOICE',
      ),
      packingList: this.findExtractedData<ExtractedPackingList>(
        set.documents,
        'PACKING_LIST',
      ),
      billOfLading: this.findExtractedData<ExtractedBillOfLading>(
        set.documents,
        'BILL_OF_LADING',
      ),
      insurance: this.findExtractedData<ExtractedInsurance>(
        set.documents,
        'INSURANCE',
      ),
      uploadedDocTypes: [
        ...new Set(
          set.documents
            .map((document) => document.docType)
            .filter((docType): docType is string => docType !== null),
        ),
      ],
    };
  }

  private findExtractedData<T>(
    documents: SetDocument[],
    docType: string,
  ): T | null {
    const document = documents.find(
      (candidate) =>
        candidate.docType === docType && candidate.extractedData !== null,
    );

    return document ? (document.extractedData as T) : null;
  }
}
