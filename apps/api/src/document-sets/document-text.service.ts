import { BadRequestException, Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PDFParse } from 'pdf-parse';

@Injectable()
export class DocumentTextService {
  async extractText(mimeType: string, storedPath: string): Promise<string> {
    const absolutePath = join(process.cwd(), storedPath);

    let text: string;
    try {
      if (mimeType === 'text/plain') {
        text = await readFile(absolutePath, 'utf8');
      } else if (mimeType === 'application/pdf') {
        text = await this.extractPdfText(absolutePath);
      } else {
        throw new BadRequestException(
          `Text extraction is not supported for file type "${mimeType}".`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Could not extract text from the document: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    if (!text.trim()) {
      throw new BadRequestException(
        'No text could be extracted from the document. Scanned PDFs without a text layer are not supported (OCR is not enabled).',
      );
    }

    return text;
  }

  private async extractPdfText(absolutePath: string): Promise<string> {
    const data = await readFile(absolutePath);
    const parser = new PDFParse({ data });

    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }
}
