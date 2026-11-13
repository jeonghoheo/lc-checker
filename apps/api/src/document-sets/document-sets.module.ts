import { Module } from '@nestjs/common';
import { AiExtractionService } from './ai-extraction.service.js';
import { BillOfLadingExtractionService } from './bill-of-lading-extraction.service.js';
import { DocumentSetsController } from './document-sets.controller.js';
import { DocumentSetsService } from './document-sets.service.js';
import { DocumentTextService } from './document-text.service.js';
import { DocumentTypeService } from './document-type.service.js';
import { InsuranceExtractionService } from './insurance-extraction.service.js';
import { InvoiceExtractionService } from './invoice-extraction.service.js';
import { LcParserService } from './lc-parser.service.js';
import { PackingListExtractionService } from './packing-list-extraction.service.js';

@Module({
  controllers: [DocumentSetsController],
  providers: [
    DocumentSetsService,
    DocumentTextService,
    DocumentTypeService,
    LcParserService,
    AiExtractionService,
    InvoiceExtractionService,
    PackingListExtractionService,
    BillOfLadingExtractionService,
    InsuranceExtractionService,
  ],
})
export class DocumentSetsModule {}
