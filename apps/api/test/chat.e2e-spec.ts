import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { NO_CONTEXT_ANSWER } from '../src/chat/prompt.js';

// LLM answers are not deterministic, so these cover the paths that don't
// depend on generated text.
describe('Chat (e2e)', () => {
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

  it('validates the request body', async () => {
    const res = await request(app.getHttpServer())
      .post('/chat')
      .send({ question: '', documentIds: ['not-a-uuid'] })
      .expect(400);
    expect(Object.keys(res.body.errors)).toEqual(
      expect.arrayContaining(['question', 'documentIds']),
    );
  });

  it('answers "not found" without sources when nothing is relevant', async () => {
    const res = await request(app.getHttpServer())
      .post('/chat')
      .send({
        question: 'What is the capital of France?',
        documentIds: ['00000000-0000-4000-8000-000000000000'],
      })
      .expect(200);
    expect(res.body).toEqual({ answer: NO_CONTEXT_ANSWER, sources: [] });
  });
});
