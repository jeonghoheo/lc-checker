import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentSetsService } from './document-sets.service.js';

const ALLOWED_MIME_TYPES = ['application/pdf', 'text/plain'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Controller('document-sets')
export class DocumentSetsController {
  constructor(private readonly documentSetsService: DocumentSetsService) {}

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentSetsService.getSet(id);
  }
}
