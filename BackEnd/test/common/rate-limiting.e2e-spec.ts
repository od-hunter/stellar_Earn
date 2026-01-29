import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { Keypair } from 'stellar-sdk';

import { AppModule } from '../../src/app.module';

const sleep = (ms = 2100) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Rate Limiting (e2e)', () => {
  let app: INestApplication<App>;
  let server: any;

  const adminKeypair = Keypair.random();
  const userKeypair = Keypair.random();
  const secondUserKeypair = Keypair.random();

  const fetchChallenge = async (stellarAddress: string): Promise<string> => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await request(server)
        .post('/auth/challenge')
        .send({ stellarAddress });

      if (response.status === 200 && response.body?.challenge) {
        return response.body.challenge as string;
      }

      await sleep();
    }

    throw new Error('Failed to fetch auth challenge');
  };

  const login = async (keypair: Keypair): Promise<string> => {
    const stellarAddress = keypair.publicKey();

    const challenge = await fetchChallenge(stellarAddress);
    const signature = keypair
      .sign(Buffer.from(challenge, 'utf8'))
      .toString('base64');

    const loginResponse = await request(server)
      .post('/auth/login')
      .send({ stellarAddress, signature, challenge });

    return loginResponse.body.accessToken;
  };

  beforeAll(async () => {
    process.env.RATE_LIMIT_TTL = '2';
    process.env.RATE_LIMIT_LIMIT = '2';
    process.env.RATE_LIMIT_AUTH_TTL = '2';
    process.env.RATE_LIMIT_AUTH_LIMIT = '3';
    process.env.ADMIN_ADDRESSES = adminKeypair.publicKey();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('enforces default limits and exposes headers', async () => {
    const first = await request(server).get('/');
    expect(first.headers['x-ratelimit-limit']).toBeDefined();
    expect(first.headers['x-ratelimit-remaining']).toBeDefined();

    await request(server).get('/');
    const blocked = await request(server).get('/');
    expect(blocked.status).toBe(429);
  });

  it('applies endpoint-specific auth limits', async () => {
    await sleep();

    const payload = { stellarAddress: userKeypair.publicKey() };
    const first = await request(server).post('/auth/challenge').send(payload);
    const second = await request(server).post('/auth/challenge').send(payload);
    const blocked = await request(server).post('/auth/challenge').send(payload);

    expect(first.headers['x-ratelimit-limit-auth']).toBeDefined();
    expect(blocked.status).toBe(429);
  });

  it('uses user identities for tracking and bypasses admins', async () => {
    await sleep();

    const userToken = await login(userKeypair);
    const anotherUserToken = await login(secondUserKeypair);
    const adminToken = await login(adminKeypair);

    const userFirst = await request(server)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${userToken}`);
    const userSecond = await request(server)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${userToken}`);
    const userBlocked = await request(server)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${userToken}`);

    expect(userFirst.status).toBe(200);
    expect(userSecond.status).toBe(200);
    expect(userBlocked.status).toBe(429);

    const otherUser = await request(server)
      .get('/auth/profile')
      .set('Authorization', `Bearer ${anotherUserToken}`);
    expect(otherUser.status).toBe(200);

    const adminResponses = await Promise.all(
      Array(3)
        .fill(null)
        .map(() =>
          request(server)
            .get('/auth/profile')
            .set('Authorization', `Bearer ${adminToken}`),
        ),
    );

    adminResponses.forEach((response) => {
      expect(response.status).toBe(200);
    });
  });
});
