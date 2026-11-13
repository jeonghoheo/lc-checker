import { Module } from '@nestjs/common';
import { DocumentSetsController } from './document-sets.controller.js';
import { DocumentSetsService } from './document-sets.service.js';
import { DocumentTextService } from './document-text.service.js';
import { DocumentTypeService } from './document-type.service.js';

@Module({
  controllers: [DocumentSetsController],
  providers: [DocumentSetsService, DocumentTextService, DocumentTypeService],
})
export class DocumentSetsModule {}
