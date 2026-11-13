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
import { DocumentTextService } from './document-text.service.js';
import { DocumentTypeService } from './document-type.service.js';
import { InvoiceExtractionService } from './invoice-extraction.service.js';
import { LcParserService } from './lc-parser.service.js';

@Injectable()
export class DocumentSetsService {
  private readonly logger = new Logger(DocumentSetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentTextService: DocumentTextService,
    private readonly documentTypeService: DocumentTypeService,
    private readonly lcParserService: LcParserService,
    private readonly invoiceExtractionService: InvoiceExtractionService,
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
