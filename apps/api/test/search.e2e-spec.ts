import { fileURLToPath } from 'node:url';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

const fixture = fileURLToPath(
  new URL('./fixtures/handbook.pdf', import.meta.url),
);

describe('Search (e2e)', () => {
  let app: INestApplication;
  let documentId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    const res = await request(app.getHttpServer())
      .post('/documents')
      .attach('file', fixture)
      .expect(201);
    documentId = res.body.id;
  });

  afterAll(async () => {
    await request(app.getHttpServer()).delete(`/documents/${documentId}`);
    await app.close();
  });

  it('returns the most relevant chunk first, with page and score', async () => {
    const res = await request(app.getHttpServer())
      .get('/search')
      .query({ q: 'What should I do if I lose my badge?', limit: 2 })
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      documentId,
      documentName: 'handbook.pdf',
      page: 2,
    });
    expect(res.body[0].score).toBeGreaterThan(res.body[1].score);
  });

  it('validates the query', async () => {
    await request(app.getHttpServer()).get('/search').expect(400);
    await request(app.getHttpServer())
      .get('/search')
      .query({ q: 'x', limit: 0 })
      .expect(400);
  });
});
