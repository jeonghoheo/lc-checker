import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service.js';
import { DocumentTextService } from './document-text.service.js';
import { DocumentTypeService } from './document-type.service.js';

@Injectable()
export class DocumentSetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentTextService: DocumentTextService,
    private readonly documentTypeService: DocumentTypeService,
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

  private async detectDocType(mimeType: string, storedPath: string) {
    try {
      const text = await this.documentTextService.extractText(
        mimeType,
        storedPath,
      );
      return this.documentTypeService.detect(text);
    } catch {
      return null;
    }
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

    const docType = await this.detectDocType(file.mimetype, storedPath);

    try {
      return await this.prisma.document.create({
        data: {
          setId,
          originalName: file.originalname,
          storedPath,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          docType,
        },
      });
    } catch (error) {
      throw new BadRequestException(
        `Could not save document: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
