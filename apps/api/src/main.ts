import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { MulterExceptionFilter } from './document-sets/multer-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: 'http://localhost:5173' });

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new MulterExceptionFilter(httpAdapter));

  await app.listen(3000);
}
await bootstrap();
