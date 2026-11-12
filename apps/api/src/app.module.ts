import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DocumentSetsModule } from './document-sets/document-sets.module.js';
import { HealthController } from './health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, DocumentSetsModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
