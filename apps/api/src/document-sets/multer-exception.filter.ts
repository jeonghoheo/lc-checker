import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  PayloadTooLargeException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

@Catch()
export class MulterExceptionFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const code = (exception as { code?: string } | null)?.code;
    const isOversized =
      code === 'LIMIT_FILE_SIZE' ||
      (exception instanceof PayloadTooLargeException &&
        String(exception.message).includes('File too large'));

    if (isOversized) {
      super.catch(
        new BadRequestException('File too large. Maximum size is 10 MB.'),
        host,
      );
      return;
    }

    super.catch(exception, host);
  }
}
