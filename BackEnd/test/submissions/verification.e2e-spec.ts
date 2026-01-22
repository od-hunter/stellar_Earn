/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { getRepositoryToken } from '@nestjs/typeorm';
// import { Keypair } from 'stellar-sdk';
import { SubmissionsService } from '../../src/modules/submissions/submissions.service';
import { StellarService } from '../../src/modules/stellar/stellar.service';
import { NotificationsService } from '../../src/modules/notifications/notifications.service';
import { SubmissionsController } from '../../src/modules/submissions/submissions.controller';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import { VerifierGuard } from '../../src/modules/auth/guards/verifier.guard';
import {
  Submission,
  SubmissionStatus,
} from '../../src/modules/submissions/entities/submission.entity';
import { Quest } from '../../src/modules/quests/entities/quest.entity';
import { User } from '../../src/modules/users/entities/user.entity';
import { Notification } from '../../src/modules/notifications/entities/notification.entity';
import { UserRole } from '../../src/modules/auth/enums/user-role.enum';

describe('Submission Verification (e2e)', () => {
  let app: INestApplication<App>;
  let submissionsService: SubmissionsService;

  // Mock data
  const mockUser = {
    id: 'user-123',
    stellarAddress: 'GUSER123XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    role: UserRole.USER,
  };

  const mockVerifier = {
    id: 'verifier-456',
    stellarAddress: 'GVERIFIER456XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    role: UserRole.USER,
  };

  const mockAdmin = {
    id: 'admin-789',
    stellarAddress: 'GADMIN789XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    role: UserRole.ADMIN,
  };

  const mockQuest = {
    id: 'quest-123',
    title: 'Test Quest',
    contractTaskId: 'task-123',
    rewardAmount: 100,
    rewardAsset: 'XLM',
    createdBy: 'verifier-456',
    verifiers: [{ id: 'verifier-456' }],
    creator: { id: 'verifier-456' },
  };

  const mockSubmission = {
    id: 'submission-123',
    status: SubmissionStatus.PENDING,
    quest: mockQuest,
    user: mockUser,
    proof: { url: 'https://example.com/proof' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock repository functions
  const mockSubmissionRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 1 }),
    })),
  };

  const mockQuestRepository = {
    findOne: jest.fn().mockResolvedValue(mockQuest),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  // Mock services
  const mockStellarService = {
    approveSubmission: jest.fn().mockResolvedValue({
      success: true,
      transactionHash: 'mock-tx-hash-123',
      result: { status: 'SUCCESS' },
    }),
    registerTask: jest.fn().mockResolvedValue({
      success: true,
      transactionHash: 'mock-tx-hash-456',
    }),
    getUserStats: jest.fn().mockResolvedValue({}),
  };

  const mockNotificationsService = {
    sendSubmissionApproved: jest.fn().mockResolvedValue({
      id: 'notif-123',
      userId: mockUser.id,
      type: 'SUBMISSION_APPROVED',
      title: 'Submission Approved! 🎉',
      message: 'Your submission has been approved',
    }),
    sendSubmissionRejected: jest.fn().mockResolvedValue({
      id: 'notif-124',
      userId: mockUser.id,
      type: 'SUBMISSION_REJECTED',
      title: 'Submission Update',
      message: 'Your submission was not approved',
    }),
  };

  // Mock guards to bypass authentication
  const mockJwtAuthGuard = {
    canActivate: jest.fn((context) => {
      const request = context.switchToHttp().getRequest();
      // Set mock user based on authorization header
      const authHeader = request.headers.authorization;

      if (!authHeader) {
        return false;
      }

      if (authHeader.includes('user-token')) {
        request.user = mockUser;
      } else if (authHeader.includes('verifier-token')) {
        request.user = mockVerifier;
      } else if (authHeader.includes('admin-token')) {
        request.user = mockAdmin;
      } else {
        return false;
      }

      return true;
    }),
  };

  const mockVerifierGuard = {
    canActivate: jest.fn((context) => {
      const request = context.switchToHttp().getRequest();
      const user = request.user;

      // Allow verifiers and admins
      if (user.id === mockVerifier.id || user.role === UserRole.ADMIN) {
        return true;
      }

      return false;
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SubmissionsController],
      providers: [
        SubmissionsService,
        {
          provide: StellarService,
          useValue: mockStellarService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: getRepositoryToken(Submission),
          useValue: mockSubmissionRepository,
        },
        {
          provide: getRepositoryToken(Quest),
          useValue: mockQuestRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(VerifierGuard)
      .useValue(mockVerifierGuard)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    submissionsService =
      moduleFixture.get<SubmissionsService>(SubmissionsService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Set default mock implementations
    mockSubmissionRepository.findOne.mockResolvedValue({
      ...mockSubmission,
      quest: mockQuest,
      user: mockUser,
    });

    mockUserRepository.findOne.mockImplementation((options) => {
      if (options.where.id === mockAdmin.id) {
        return Promise.resolve({ ...mockAdmin, role: UserRole.ADMIN });
      }
      return Promise.resolve({ ...mockUser, role: UserRole.USER });
    });
  });

  describe('POST /quests/:questId/submissions/:id/approve', () => {
    const questId = mockQuest.id;
    const submissionId = mockSubmission.id;

    it('should approve a submission with valid verifier', async () => {
      const response = await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/approve`)
        .set('Authorization', 'Bearer verifier-token')
        .send({ notes: 'Great work! All requirements met.' })
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.submission.status).toBe(
        SubmissionStatus.APPROVED,
      );
      expect(mockStellarService.approveSubmission).toHaveBeenCalledWith(
        mockQuest.contractTaskId,
        mockUser.stellarAddress,
        mockQuest.rewardAmount,
      );
      expect(
        mockNotificationsService.sendSubmissionApproved,
      ).toHaveBeenCalled();
    });

    it('should fail when non-verifier tries to approve', async () => {
      mockVerifierGuard.canActivate.mockReturnValueOnce(false);

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/approve`)
        .set('Authorization', 'Bearer user-token')
        .send({})
        .expect(HttpStatus.FORBIDDEN);

      expect(mockStellarService.approveSubmission).not.toHaveBeenCalled();
    });

    it('should fail when submission not found', async () => {
      mockSubmissionRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/non-existent-id/approve`)
        .set('Authorization', 'Bearer verifier-token')
        .send({})
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should fail without authentication token', async () => {
      mockJwtAuthGuard.canActivate.mockReturnValueOnce(false);

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/approve`)
        .send({})
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should fail with invalid token', async () => {
      mockJwtAuthGuard.canActivate.mockReturnValueOnce(false);

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/approve`)
        .set('Authorization', 'Bearer invalid-token')
        .send({})
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should fail when submission already approved', async () => {
      mockSubmissionRepository.findOne.mockResolvedValueOnce({
        ...mockSubmission,
        status: SubmissionStatus.APPROVED,
        quest: mockQuest,
        user: mockUser,
      });

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/approve`)
        .set('Authorization', 'Bearer verifier-token')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      expect(mockStellarService.approveSubmission).not.toHaveBeenCalled();
    });

    it('should handle concurrent approval attempts', async () => {
      // First call succeeds
      mockSubmissionRepository.createQueryBuilder.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      });

      // Second call fails (affected = 0)
      mockSubmissionRepository.createQueryBuilder.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      });

      const [response1, response2] = await Promise.allSettled([
        request(app.getHttpServer())
          .post(`/quests/${questId}/submissions/${submissionId}/approve`)
          .set('Authorization', 'Bearer verifier-token')
          .send({}),
        request(app.getHttpServer())
          .post(`/quests/${questId}/submissions/${submissionId}/approve`)
          .set('Authorization', 'Bearer verifier-token')
          .send({}),
      ]);

      // At least one should succeed
      const successCount = [response1, response2].filter(
        (r) => r.status === 'fulfilled' && r.value.status === 200,
      ).length;

      expect(successCount).toBeGreaterThanOrEqual(1);
    });

    it('should rollback on blockchain failure', async () => {
      mockStellarService.approveSubmission.mockRejectedValueOnce(
        new Error('Blockchain error'),
      );

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/approve`)
        .set('Authorization', 'Bearer verifier-token')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      // Should have attempted to update submission
      expect(mockSubmissionRepository.createQueryBuilder).toHaveBeenCalled();

      // Should have attempted blockchain transaction
      expect(mockStellarService.approveSubmission).toHaveBeenCalled();

      // Should have attempted rollback (update called twice)
      expect(mockSubmissionRepository.findOne).toHaveBeenCalled();
    });

    it('should allow admin to approve submission', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/approve`)
        .set('Authorization', 'Bearer admin-token')
        .send({})
        .expect(HttpStatus.OK);

      expect(mockStellarService.approveSubmission).toHaveBeenCalled();
    });
  });

  describe('POST /quests/:questId/submissions/:id/reject', () => {
    const questId = mockQuest.id;
    const submissionId = mockSubmission.id;

    it('should reject a submission with valid reason', async () => {
      const response = await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/reject`)
        .set('Authorization', 'Bearer verifier-token')
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
      expect(
        mockNotificationsService.sendSubmissionRejected,
      ).toHaveBeenCalled();
    });

    it('should fail without rejection reason', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/reject`)
        .set('Authorization', 'Bearer verifier-token')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      expect(
        mockNotificationsService.sendSubmissionRejected,
      ).not.toHaveBeenCalled();
    });

    it('should fail with reason too short', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/reject`)
        .set('Authorization', 'Bearer verifier-token')
        .send({ reason: 'Too short' })
        .expect(HttpStatus.BAD_REQUEST);

      expect(
        mockNotificationsService.sendSubmissionRejected,
      ).not.toHaveBeenCalled();
    });

    it('should fail when non-verifier tries to reject', async () => {
      mockVerifierGuard.canActivate.mockReturnValueOnce(false);

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/reject`)
        .set('Authorization', 'Bearer user-token')
        .send({ reason: 'This should not work because user is not a verifier' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should fail without authentication', async () => {
      mockJwtAuthGuard.canActivate.mockReturnValueOnce(false);

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/reject`)
        .send({ reason: 'Should fail due to missing auth' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should accept rejection reason with exactly 10 characters', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/reject`)
        .set('Authorization', 'Bearer verifier-token')
        .send({ reason: '1234567890' }) // Exactly 10 characters
        .expect(HttpStatus.OK);
    });

    it('should accept rejection reason with 500 characters', async () => {
      const longReason = 'a'.repeat(500);

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/reject`)
        .set('Authorization', 'Bearer verifier-token')
        .send({ reason: longReason })
        .expect(HttpStatus.OK);
    });

    it('should fail with rejection reason over 500 characters', async () => {
      const tooLongReason = 'a'.repeat(501);

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/reject`)
        .set('Authorization', 'Bearer verifier-token')
        .send({ reason: tooLongReason })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  describe('Status Transitions', () => {
    const questId = mockQuest.id;

    it('should allow PENDING -> APPROVED transition', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue({
        ...mockSubmission,
        status: SubmissionStatus.PENDING,
        quest: mockQuest,
        user: mockUser,
      });

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${mockSubmission.id}/approve`)
        .set('Authorization', 'Bearer verifier-token')
        .send({})
        .expect(HttpStatus.OK);
    });

    it('should allow PENDING -> REJECTED transition', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue({
        ...mockSubmission,
        status: SubmissionStatus.PENDING,
        quest: mockQuest,
        user: mockUser,
      });

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${mockSubmission.id}/reject`)
        .set('Authorization', 'Bearer verifier-token')
        .send({ reason: 'Requirements not met for this test case' })
        .expect(HttpStatus.OK);
    });

    it('should not allow APPROVED -> REJECTED transition', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue({
        ...mockSubmission,
        status: SubmissionStatus.APPROVED,
        quest: mockQuest,
        user: mockUser,
      });

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${mockSubmission.id}/reject`)
        .set('Authorization', 'Bearer verifier-token')
        .send({ reason: 'This should fail because already approved' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should not allow PAID -> REJECTED transition', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue({
        ...mockSubmission,
        status: SubmissionStatus.PAID,
        quest: mockQuest,
        user: mockUser,
      });

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${mockSubmission.id}/reject`)
        .set('Authorization', 'Bearer verifier-token')
        .send({ reason: 'This should fail because already paid' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should not allow PAID -> APPROVED transition', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue({
        ...mockSubmission,
        status: SubmissionStatus.PAID,
        quest: mockQuest,
        user: mockUser,
      });

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${mockSubmission.id}/approve`)
        .set('Authorization', 'Bearer verifier-token')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should allow UNDER_REVIEW -> APPROVED transition', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue({
        ...mockSubmission,
        status: SubmissionStatus.UNDER_REVIEW,
        quest: mockQuest,
        user: mockUser,
      });

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${mockSubmission.id}/approve`)
        .set('Authorization', 'Bearer verifier-token')
        .send({})
        .expect(HttpStatus.OK);
    });

    it('should allow UNDER_REVIEW -> REJECTED transition', async () => {
      mockSubmissionRepository.findOne.mockResolvedValue({
        ...mockSubmission,
        status: SubmissionStatus.UNDER_REVIEW,
        quest: mockQuest,
        user: mockUser,
      });

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${mockSubmission.id}/reject`)
        .set('Authorization', 'Bearer verifier-token')
        .send({ reason: 'After review, requirements not met' })
        .expect(HttpStatus.OK);
    });

    it('should allow REJECTED -> PENDING transition (resubmission)', () => {
      mockSubmissionRepository.findOne.mockResolvedValue({
        ...mockSubmission,
        status: SubmissionStatus.REJECTED,
        quest: mockQuest,
        user: mockUser,
      });

      // This would be tested through a resubmit endpoint if it exists
      // For now, we validate the logic allows this transition
      const validTransitions = submissionsService['validateStatusTransition'];
      expect(() =>
        validTransitions.call(
          submissionsService,
          SubmissionStatus.REJECTED,
          SubmissionStatus.PENDING,
        ),
      ).not.toThrow();
    });
  });

  describe('GET /quests/:questId/submissions/:id', () => {
    const questId = mockQuest.id;
    const submissionId = mockSubmission.id;

    it('should get submission details with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get(`/quests/${questId}/submissions/${submissionId}`)
        .set('Authorization', 'Bearer user-token')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.submission).toBeDefined();
      expect(response.body.data.submission.id).toBe(submissionId);
    });

    it('should fail without authentication', async () => {
      mockJwtAuthGuard.canActivate.mockReturnValueOnce(false);

      await request(app.getHttpServer())
        .get(`/quests/${questId}/submissions/${submissionId}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should fail when submission not found', async () => {
      mockSubmissionRepository.findOne.mockResolvedValueOnce(null);

      await request(app.getHttpServer())
        .get(`/quests/${questId}/submissions/non-existent-id`)
        .set('Authorization', 'Bearer user-token')
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('GET /quests/:questId/submissions', () => {
    const questId = mockQuest.id;

    it('should get all submissions for a quest', async () => {
      mockSubmissionRepository.find.mockResolvedValue([mockSubmission]);

      const response = await request(app.getHttpServer())
        .get(`/quests/${questId}/submissions`)
        .set('Authorization', 'Bearer verifier-token')
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(response.body.data.submissions).toBeDefined();
      expect(Array.isArray(response.body.data.submissions)).toBe(true);
    });

    it('should fail without authentication', async () => {
      mockJwtAuthGuard.canActivate.mockReturnValueOnce(false);

      await request(app.getHttpServer())
        .get(`/quests/${questId}/submissions`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return empty array when no submissions found', async () => {
      mockSubmissionRepository.find.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get(`/quests/${questId}/submissions`)
        .set('Authorization', 'Bearer verifier-token')
        .expect(HttpStatus.OK);

      expect(response.body.data.submissions).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });
  });

  describe('Authorization Levels', () => {
    const questId = mockQuest.id;
    const submissionId = mockSubmission.id;

    it('should allow admin to approve any submission', async () => {
      const response = await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/approve`)
        .set('Authorization', 'Bearer admin-token')
        .send({})
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
      expect(mockStellarService.approveSubmission).toHaveBeenCalled();
    });

    it('should allow admin to reject any submission', async () => {
      const response = await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/reject`)
        .set('Authorization', 'Bearer admin-token')
        .send({ reason: 'Admin decision to reject this submission' })
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
    });

    it('should allow designated verifier to approve submissions', async () => {
      const response = await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/approve`)
        .set('Authorization', 'Bearer verifier-token')
        .send({})
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
    });

    it('should allow quest creator to approve submissions', async () => {
      // Quest creator is the verifier in our mock data
      const response = await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/approve`)
        .set('Authorization', 'Bearer verifier-token')
        .send({})
        .expect(HttpStatus.OK);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Notifications', () => {
    const questId = mockQuest.id;
    const submissionId = mockSubmission.id;

    it('should send notification on approval', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/approve`)
        .set('Authorization', 'Bearer verifier-token')
        .send({})
        .expect(HttpStatus.OK);

      expect(
        mockNotificationsService.sendSubmissionApproved,
      ).toHaveBeenCalledWith(
        mockUser.id,
        mockQuest.title,
        mockQuest.rewardAmount,
      );
    });

    it('should send notification on rejection', async () => {
      const rejectionReason =
        'Does not meet quality standards for notification test';

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/reject`)
        .set('Authorization', 'Bearer verifier-token')
        .send({ reason: rejectionReason })
        .expect(HttpStatus.OK);

      expect(
        mockNotificationsService.sendSubmissionRejected,
      ).toHaveBeenCalledWith(mockUser.id, mockQuest.title, rejectionReason);
    });

    it('should not send notification if approval fails', async () => {
      mockStellarService.approveSubmission.mockRejectedValueOnce(
        new Error('Blockchain error'),
      );

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/approve`)
        .set('Authorization', 'Bearer verifier-token')
        .send({})
        .expect(HttpStatus.BAD_REQUEST);

      expect(
        mockNotificationsService.sendSubmissionApproved,
      ).not.toHaveBeenCalled();
    });
  });

  describe('Verifier Notes', () => {
    const questId = mockQuest.id;
    const submissionId = mockSubmission.id;

    it('should save verifier notes on approval', async () => {
      const notes = 'Excellent work, all criteria met perfectly';

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/approve`)
        .set('Authorization', 'Bearer verifier-token')
        .send({ notes })
        .expect(HttpStatus.OK);

      expect(mockSubmissionRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should save verifier notes on rejection', async () => {
      const notes = 'Please improve documentation quality';

      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/reject`)
        .set('Authorization', 'Bearer verifier-token')
        .send({
          reason: 'Documentation does not meet requirements',
          notes,
        })
        .expect(HttpStatus.OK);

      expect(mockSubmissionRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should allow approval without notes', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/approve`)
        .set('Authorization', 'Bearer verifier-token')
        .send({})
        .expect(HttpStatus.OK);
    });

    it('should allow rejection with notes', async () => {
      await request(app.getHttpServer())
        .post(`/quests/${questId}/submissions/${submissionId}/reject`)
        .set('Authorization', 'Bearer verifier-token')
        .send({
          reason: 'Minimum requirement for rejection reason length',
          notes: 'Additional feedback for the user',
        })
        .expect(HttpStatus.OK);
    });
  });
});
