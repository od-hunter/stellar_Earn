/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Submission,
  SubmissionStatus,
} from '../../src/modules/submissions/entities/submission.entity';
import { Repository } from 'typeorm';
import { StellarService } from '../../src/modules/stellar/stellar.service';

describe('Submission Verification (e2e)', () => {
  let app: INestApplication;
  let submissionRepo: Repository<Submission>;
  let authToken: string;
  let verifierToken: string;
  let testSubmissionId: string;
  let testQuestId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    submissionRepo = moduleFixture.get<Repository<Submission>>(
      getRepositoryToken(Submission),
    );

    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    testQuestId = 'test-quest-123';
    testSubmissionId = 'test-submission-456';

    const userResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ stellarAddress: 'TEST_USER_ADDRESS' });
    authToken = userResponse.body.token as string;

    const verifierResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ stellarAddress: 'TEST_VERIFIER_ADDRESS' });
    verifierToken = verifierResponse.body.token as string;
  }

  async function cleanupTestData() {
    await submissionRepo.delete({ id: testSubmissionId });
  }

  describe('POST /quests/:questId/submissions/:id/approve', () => {
    it('should approve a submission with valid verifier', async () => {
      const response = await request(app.getHttpServer())
        .post(`/quests/${testQuestId}/submissions/${testSubmissionId}/approve`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({ notes: 'Great work! All requirements met.' })
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.submission.status).toBe(
        SubmissionStatus.APPROVED,
      );
      expect(response.body.data.submission.approvedBy).toBeDefined();
      expect(response.body.data.submission.approvedAt).toBeDefined();
    });

    it('should fail when non-verifier tries to approve', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${testQuestId}/submissions/${testSubmissionId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should fail when submission not found', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${testQuestId}/submissions/non-existent-id/approve`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({})
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should fail when submission already approved', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${testQuestId}/submissions/${testSubmissionId}/approve`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({})
        .expect(HttpStatus.OK);

      await request(app.getHttpServer())
        .post(`/quests/${testQuestId}/submissions/${testSubmissionId}/approve`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should handle concurrent approval attempts', async () => {
      const results = await Promise.allSettled([
        request(app.getHttpServer())
          .post(
            `/quests/${testQuestId}/submissions/${testSubmissionId}/approve`,
          )
          .set('Authorization', `Bearer ${verifierToken}`)
          .send({}),
        request(app.getHttpServer())
          .post(
            `/quests/${testQuestId}/submissions/${testSubmissionId}/approve`,
          )
          .set('Authorization', `Bearer ${verifierToken}`)
          .send({}),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      expect(successes.length).toBeGreaterThanOrEqual(1);
    });

    it('should rollback on blockchain failure', async () => {
      const stellarService = app.get(StellarService);
      jest
        .spyOn(stellarService, 'approveSubmission')
        .mockRejectedValue(new Error('Blockchain error'));

      await request(app.getHttpServer())
        .post(`/quests/${testQuestId}/submissions/${testSubmissionId}/approve`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      const submission = await submissionRepo.findOne({
        where: { id: testSubmissionId },
      });

      expect(submission).toBeDefined();
      expect(submission?.status).not.toBe(SubmissionStatus.APPROVED);
    });
  });

  describe('POST /quests/:questId/submissions/:id/reject', () => {
    it('should reject a submission with valid reason', async () => {
      const response = await request(app.getHttpServer())
        .post(`/quests/${testQuestId}/submissions/${testSubmissionId}/reject`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({
          reason: 'The proof provided does not meet the requirements.',
          notes: 'Please resubmit with proper documentation.',
        })
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.submission.status).toBe(
        SubmissionStatus.REJECTED,
      );
      expect(response.body.data.submission.rejectionReason).toBeDefined();
      expect(response.body.data.submission.rejectedBy).toBeDefined();
    });

    it('should fail without rejection reason', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${testQuestId}/submissions/${testSubmissionId}/reject`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should fail with reason too short', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${testQuestId}/submissions/${testSubmissionId}/reject`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({ reason: 'Too short' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should fail when non-verifier tries to reject', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${testQuestId}/submissions/${testSubmissionId}/reject`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ reason: 'This should not work' })
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  describe('Status Transitions', () => {
    it('should allow PENDING -> APPROVED transition', async () => {
      const submission = await submissionRepo.save({
        id: 'test-pending-sub',
        status: SubmissionStatus.PENDING,
      } as Submission);

      await request(app.getHttpServer())
        .post(`/quests/${testQuestId}/submissions/${submission.id}/approve`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({})
        .expect(HttpStatus.OK);
    });

    it('should allow PENDING -> REJECTED transition', async () => {
      const submission = await submissionRepo.save({
        id: 'test-pending-sub-2',
        status: SubmissionStatus.PENDING,
      } as Submission);

      await request(app.getHttpServer())
        .post(`/quests/${testQuestId}/submissions/${submission.id}/reject`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({ reason: 'Requirements not met for this test' })
        .expect(HttpStatus.OK);
    });

    it('should not allow APPROVED -> REJECTED transition', async () => {
      const submission = await submissionRepo.save({
        id: 'test-approved-sub',
        status: SubmissionStatus.APPROVED,
      } as Submission);

      await request(app.getHttpServer())
        .post(`/quests/${testQuestId}/submissions/${submission.id}/reject`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({ reason: 'This should fail' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should not allow PAID -> any transition', async () => {
      const submission = await submissionRepo.save({
        id: 'test-paid-sub',
        status: SubmissionStatus.PAID,
      } as Submission);

      await request(app.getHttpServer())
        .post(`/quests/${testQuestId}/submissions/${submission.id}/reject`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({ reason: 'This should fail' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Notifications', () => {
    it('should send notification on approval', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${testQuestId}/submissions/${testSubmissionId}/approve`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({})
        .expect(HttpStatus.OK);

      const notificationsResponse = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(notificationsResponse.body.data.notifications).toContainEqual(
        expect.objectContaining({ type: 'SUBMISSION_APPROVED' }),
      );
    });

    it('should send notification on rejection', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${testQuestId}/submissions/${testSubmissionId}/reject`)
        .set('Authorization', `Bearer ${verifierToken}`)
        .send({ reason: 'Does not meet quality standards' })
        .expect(HttpStatus.OK);

      const notificationsResponse = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(notificationsResponse.body.data.notifications).toContainEqual(
        expect.objectContaining({ type: 'SUBMISSION_REJECTED' }),
      );
    });
  });
});
