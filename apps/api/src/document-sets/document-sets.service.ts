import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { BillOfLadingExtractionService } from './bill-of-lading-extraction.service.js';
import { DocumentTextService } from './document-text.service.js';
import { DocumentTypeService } from './document-type.service.js';
import { InsuranceExtractionService } from './insurance-extraction.service.js';
import { InvoiceExtractionService } from './invoice-extraction.service.js';
import { LcParserService } from './lc-parser.service.js';
import { PackingListExtractionService } from './packing-list-extraction.service.js';

@Injectable()
export class DocumentSetsService {
  private readonly logger = new Logger(DocumentSetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentTextService: DocumentTextService,
    private readonly documentTypeService: DocumentTypeService,
    private readonly lcParserService: LcParserService,
    private readonly invoiceExtractionService: InvoiceExtractionService,
    private readonly packingListExtractionService: PackingListExtractionService,
    private readonly billOfLadingExtractionService: BillOfLadingExtractionService,
    private readonly insuranceExtractionService: InsuranceExtractionService,
  ) {}

  createSet() {
    return this.prisma.documentSet.create({ data: {} });
  }

  async getSet(id: string) {
    const set = await this.prisma.documentSet.findUnique({
      where: { id },
      include: { documents: true },
    });

    if (!set) {
      throw new NotFoundException(`Document set ${id} not found`);
    }

    return set;
  }

  async setPresentationDate(id: string, presentationDate: unknown) {
    if (
      typeof presentationDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(presentationDate)
    ) {
      throw new BadRequestException(
        'presentationDate must be an ISO date string (yyyy-mm-dd).',
      );
    }

    const parsed = new Date(`${presentationDate}T00:00:00.000Z`);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== presentationDate
    ) {
      throw new BadRequestException(
        'presentationDate must be a valid date in yyyy-mm-dd format.',
      );
    }

    const set = await this.prisma.documentSet.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!set) {
      throw new NotFoundException(`Document set ${id} not found`);
    }

    return this.prisma.documentSet.update({
      where: { id },
      data: { presentationDate: parsed },
    });
  }

  async getDocumentText(setId: string, docId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: docId, setId },
    });

    if (!document) {
      throw new NotFoundException(
        `Document ${docId} not found in document set ${setId}`,
      );
    }

    return {
      text: await this.documentTextService.extractText(
        document.mimeType,
        document.storedPath,
      ),
    };
  }

  private async extractDocumentData(
    mimeType: string,
    storedPath: string,
  ) {
    let text: string;

    try {
      text = await this.documentTextService.extractText(mimeType, storedPath);
    } catch {
      return { docType: null, extractedData: null };
    }

    const docType = this.documentTypeService.detect(text);

    try {
      if (docType === 'LC') {
        return { docType, extractedData: this.lcParserService.parse(text) };
      }

      if (docType === 'INVOICE') {
        const extractedData = await this.invoiceExtractionService.extract(text);
        return { docType, extractedData };
      }

      if (docType === 'PACKING_LIST') {
        const extractedData =
          await this.packingListExtractionService.extract(text);
        return { docType, extractedData };
      }

      if (docType === 'BILL_OF_LADING') {
        const extractedData =
          await this.billOfLadingExtractionService.extract(text);
        return { docType, extractedData };
      }

      if (docType === 'INSURANCE') {
        const extractedData =
          await this.insuranceExtractionService.extract(text);
        return { docType, extractedData };
      }
    } catch (error) {
      this.logger.warn(
        `Could not extract data from ${docType} document: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    return { docType, extractedData: null };
  }

  async addDocument(setId: string, file: Express.Multer.File) {
    const set = await this.prisma.documentSet.findUnique({
      where: { id: setId },
      select: { id: true },
    });

    if (!set) {
      throw new NotFoundException(`Document set ${setId} not found`);
    }

    const fileName = `${randomUUID()}${extname(file.originalname)}`;
    const directory = join(process.cwd(), 'uploads', setId);
    const absolutePath = join(directory, fileName);
    const storedPath = `uploads/${setId}/${fileName}`;

    await mkdir(directory, { recursive: true });
    await writeFile(absolutePath, file.buffer);

    const { docType, extractedData } = await this.extractDocumentData(
      file.mimetype,
      storedPath,
    );

    try {
      return await this.prisma.document.create({
        data: {
          setId,
          originalName: file.originalname,
          storedPath,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          docType,
          ...(extractedData ? { extractedData } : {}),
        },
      });
    } catch (error) {
      throw new BadRequestException(
        `Could not save document: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
