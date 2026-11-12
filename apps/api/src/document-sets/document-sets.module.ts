import { Module } from '@nestjs/common';
import { DocumentSetsController } from './document-sets.controller.js';
import { DocumentSetsService } from './document-sets.service.js';

@Module({
  controllers: [DocumentSetsController],
  providers: [DocumentSetsService],
})
export class DocumentSetsModule {}
