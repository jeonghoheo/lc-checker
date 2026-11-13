import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ChecksService } from '../checks/checks.service.js';
import { ReportService } from '../checks/report.service.js';
import { DocumentSetsService } from './document-sets.service.js';

const ALLOWED_MIME_TYPES = ['application/pdf', 'text/plain'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Controller('document-sets')
export class DocumentSetsController {
  constructor(
    private readonly documentSetsService: DocumentSetsService,
    private readonly checksService: ChecksService,
    private readonly reportService: ReportService,
  ) {}

  @Post()
  create() {
    return this.documentSetsService.createSet();
  }

  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE, files: 1 },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException(
              `Unsupported file type "${file.mimetype}". Only PDF (application/pdf) and plain text (text/plain) files are allowed.`,
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  upload(
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded. Send one file in the multipart form field "file".',
      );
    }

    return this.documentSetsService.addDocument(id, file);
  }

  @Patch(':id/presentation-date')
  setPresentationDate(
    @Param('id') id: string,
    @Body() body: { presentationDate?: unknown },
  ) {
    return this.documentSetsService.setPresentationDate(
      id,
      body?.presentationDate,
    );
  }

  @Post(':id/check')
  runCheck(@Param('id') id: string) {
    return this.checksService.runCheck(id);
  }

  @Get(':id/report')
  async getReport(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const report = await this.reportService.generate(id);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${report.filename}"`,
    );
    return report.html;
  }

  @Get(':id/documents/:docId/text')
  getDocumentText(
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.documentSetsService.getDocumentText(id, docId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentSetsService.getSet(id);
  }
}
