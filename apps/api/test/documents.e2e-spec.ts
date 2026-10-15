import { fileURLToPath } from 'node:url';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const fixture = fileURLToPath(
  new URL('./fixtures/handbook.pdf', import.meta.url),
);

describe('Documents (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('uploads, lists, fetches and deletes a pdf', async () => {
    const upload = await request(app.getHttpServer())
      .post('/documents')
      .attach('file', fixture)
      .expect(201);
    expect(upload.body).toMatchObject({
      name: 'handbook.pdf',
      mimeType: 'application/pdf',
    });
    expect(upload.body.chunkCount).toBeGreaterThanOrEqual(2);
    const { id } = upload.body;

    const list = await request(app.getHttpServer())
      .get('/documents')
      .expect(200);
    expect(list.body.map((d: { id: string }) => d.id)).toContain(id);

    await request(app.getHttpServer()).get(`/documents/${id}`).expect(200);
    await request(app.getHttpServer()).delete(`/documents/${id}`).expect(204);
    await request(app.getHttpServer()).get(`/documents/${id}`).expect(404);
  });

  it('rejects requests without a file', () =>
    request(app.getHttpServer()).post('/documents').expect(400));

  it('rejects unsupported file types', () =>
    request(app.getHttpServer())
      .post('/documents')
      .attach('file', Buffer.from('x'), 'image.png')
      .expect(415));

  it('rejects files without text', () =>
    request(app.getHttpServer())
      .post('/documents')
      .attach('file', Buffer.from('   '), 'empty.txt')
      .expect(422));
});
