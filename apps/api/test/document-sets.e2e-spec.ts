import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Document sets upload (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdSetIds: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma && createdSetIds.length > 0) {
      await prisma.document.deleteMany({
        where: { setId: { in: createdSetIds } },
      });
      await prisma.documentSet.deleteMany({
        where: { id: { in: createdSetIds } },
      });
    }

    for (const setId of createdSetIds) {
      await rm(join(process.cwd(), 'uploads', setId), {
        recursive: true,
        force: true,
      });
    }

    await app?.close();
  });

  async function createSet() {
    const response = await request(app.getHttpServer())
      .post('/document-sets')
      .expect(201);

    const setId = response.body.id as string;
    createdSetIds.push(setId);
    return setId;
  }

  it('uploads a small text file and lists it when reading the set back', async () => {
    const setId = await createSet();
    const content = 'hello e2e';

    const upload = await request(app.getHttpServer())
      .post(`/document-sets/${setId}/documents`)
      .attach('file', Buffer.from(content), {
        filename: 'sample.txt',
        contentType: 'text/plain',
      })
      .expect(201);

    expect(upload.body).toMatchObject({
      setId,
      originalName: 'sample.txt',
      mimeType: 'text/plain',
      sizeBytes: Buffer.byteLength(content),
      docType: null,
    });
    expect(upload.body.storedPath).toMatch(
      new RegExp(`^uploads/${setId}/[0-9a-f-]+\\.txt$`),
    );

    const read = await request(app.getHttpServer())
      .get(`/document-sets/${setId}`)
      .expect(200);

    expect(read.body.documents).toHaveLength(1);
    expect(read.body.documents[0]).toMatchObject({
      id: upload.body.id,
      originalName: 'sample.txt',
      sizeBytes: Buffer.byteLength(content),
    });
  });

  it('returns the extracted text of an uploaded text document', async () => {
    const setId = await createSet();
    const samplePath = join(
      process.cwd(),
      '..',
      '..',
      'samples',
      'set-a',
      'lc-mt700.txt',
    );
    const content = await readFile(samplePath);

    const upload = await request(app.getHttpServer())
      .post(`/document-sets/${setId}/documents`)
      .attach('file', content, {
        filename: 'lc-mt700.txt',
        contentType: 'text/plain',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/document-sets/${setId}/documents/${upload.body.id}/text`)
      .expect(200);

    expect(response.body.text).toContain(':20: Documentary Credit Number');
    expect(response.body.text).toContain('HNBC-260781-KR');
  });

  it('rejects a disallowed file type with 400', async () => {
    const setId = await createSet();

    const response = await request(app.getHttpServer())
      .post(`/document-sets/${setId}/documents`)
      .attach('file', Buffer.from('not really a png'), {
        filename: 'image.png',
        contentType: 'image/png',
      })
      .expect(400);

    expect(response.body.message).toContain('Unsupported file type');
  });

  it('returns 404 when uploading to a non-existent document set', async () => {
    const missingSetId = randomUUID();

    const response = await request(app.getHttpServer())
      .post(`/document-sets/${missingSetId}/documents`)
      .attach('file', Buffer.from('hello'), {
        filename: 'sample.txt',
        contentType: 'text/plain',
      })
      .expect(404);

    expect(response.body.message).toContain(missingSetId);
  });
});
