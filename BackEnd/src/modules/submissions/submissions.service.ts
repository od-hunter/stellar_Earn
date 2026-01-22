import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission, SubmissionStatus } from './entities/submission.entity';
import { ApproveSubmissionDto } from './dto/approve-submission.dto';
import { RejectSubmissionDto } from './dto/reject-submission.dto';
import { StellarService } from '../stellar/stellar.service';
import { NotificationsService } from '../notifications/notifications.service';

interface QuestVerifier {
  id: string;
  // Add other verifier properties as needed
}

interface QuestWithVerifiers {
  id: string;
  verifiers: QuestVerifier[];
  createdBy: string;
}

@Injectable()
export class SubmissionsService {
  constructor(
    @InjectRepository(Submission)
    private submissionsRepository: Repository<Submission>,
    private stellarService: StellarService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Approve a submission and trigger on-chain reward distribution
   */
  async approveSubmission(
    submissionId: string,
    approveDto: ApproveSubmissionDto,
    verifierId: string,
  ): Promise<Submission> {
    // Fetch submission with relations
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
      relations: ['quest', 'user'],
    });

    if (!submission) {
      throw new NotFoundException(
        `Submission with ID ${submissionId} not found`,
      );
    }

    // Validate verifier authorization
    await this.validateVerifierAuthorization(submission.quest.id, verifierId);

    // Validate status transition
    this.validateStatusTransition(submission.status, SubmissionStatus.APPROVED);

    // Handle concurrent approval attempts using optimistic locking
    const updateResult = await this.submissionsRepository
      .createQueryBuilder()
      .update(Submission)
      .set({
        status: SubmissionStatus.APPROVED,
        approvedBy: verifierId,
        approvedAt: new Date(),
        verifierNotes: approveDto.notes,
      })
      .where('id = :id', { id: submissionId })
      .andWhere('status = :status', { status: submission.status })
      .execute();

    if (updateResult.affected === 0) {
      throw new ConflictException(
        'Submission status has changed. Please refresh and try again.',
      );
    }

    // Trigger smart contract interaction for on-chain approval
    try {
      await this.stellarService.approveSubmission(
        submission.quest.contractTaskId,
        submission.user.stellarAddress,
        submission.quest.rewardAmount,
      );
    } catch (error) {
      // Rollback status if blockchain transaction fails
      await this.submissionsRepository.update(submissionId, {
        status: submission.status,
        approvedBy: undefined,
        approvedAt: undefined,
      });
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new BadRequestException(
        `Failed to process on-chain approval: ${errorMessage}`,
      );
    }

    // Fetch updated submission
    const updatedSubmission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
      relations: ['quest', 'user'],
    });

    if (!updatedSubmission) {
      throw new NotFoundException('Submission not found after update');
    }

    // Send notification to user
    await this.notificationsService.sendSubmissionApproved(
      updatedSubmission.user.id,
      updatedSubmission.quest.title,
      updatedSubmission.quest.rewardAmount,
    );

    return updatedSubmission;
  }

  /**
   * Reject a submission with a reason
   */
  async rejectSubmission(
    submissionId: string,
    rejectDto: RejectSubmissionDto,
    verifierId: string,
  ): Promise<Submission> {
    // Fetch submission with relations
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
      relations: ['quest', 'user'],
    });

    if (!submission) {
      throw new NotFoundException(
        `Submission with ID ${submissionId} not found`,
      );
    }

    // Validate verifier authorization
    await this.validateVerifierAuthorization(submission.quest.id, verifierId);

    // Validate status transition
    this.validateStatusTransition(submission.status, SubmissionStatus.REJECTED);

    // Validate rejection reason is provided
    if (!rejectDto.reason || rejectDto.reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    // Handle concurrent rejection attempts
    const updateResult = await this.submissionsRepository
      .createQueryBuilder()
      .update(Submission)
      .set({
        status: SubmissionStatus.REJECTED,
        rejectedBy: verifierId,
        rejectedAt: new Date(),
        rejectionReason: rejectDto.reason,
        verifierNotes: rejectDto.notes,
      })
      .where('id = :id', { id: submissionId })
      .andWhere('status = :status', { status: submission.status })
      .execute();

    if (updateResult.affected === 0) {
      throw new ConflictException(
        'Submission status has changed. Please refresh and try again.',
      );
    }

    // Fetch updated submission
    const updatedSubmission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
      relations: ['quest', 'user'],
    });

    if (!updatedSubmission) {
      throw new NotFoundException('Submission not found after update');
    }

    // Send notification to user
    await this.notificationsService.sendSubmissionRejected(
      updatedSubmission.user.id,
      updatedSubmission.quest.title,
      rejectDto.reason,
    );

    return updatedSubmission;
  }

  /**
   * Validate that the verifier is authorized to approve/reject this quest
   */
  private async validateVerifierAuthorization(
    questId: string,
    verifierId: string,
  ): Promise<void> {
    // This would typically check against a quest verifiers table or role-based permissions
    // For now, we'll use a simplified check
    const quest = await this.getQuestWithVerifiers(questId);

    const isAuthorized =
      quest.verifiers.some((v) => v.id === verifierId) ||
      quest.createdBy === verifierId ||
      (await this.checkAdminRole(verifierId));

    if (!isAuthorized) {
      throw new ForbiddenException(
        'You are not authorized to verify submissions for this quest',
      );
    }
  }

  /**
   * Validate status transitions to prevent invalid state changes
   */
  private validateStatusTransition(
    currentStatus: SubmissionStatus,
    newStatus: SubmissionStatus,
  ): void {
    const validTransitions: Record<SubmissionStatus, SubmissionStatus[]> = {
      [SubmissionStatus.PENDING]: [
        SubmissionStatus.APPROVED,
        SubmissionStatus.REJECTED,
        SubmissionStatus.UNDER_REVIEW,
      ],
      [SubmissionStatus.UNDER_REVIEW]: [
        SubmissionStatus.APPROVED,
        SubmissionStatus.REJECTED,
        SubmissionStatus.PENDING,
      ],
      [SubmissionStatus.APPROVED]: [], // Cannot transition from approved
      [SubmissionStatus.REJECTED]: [SubmissionStatus.PENDING], // Allow resubmission
      [SubmissionStatus.PAID]: [], // Cannot transition from paid
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Get quest with verifier information
   * TODO: Implement actual quest fetching logic with database query
   */
  private getQuestWithVerifiers(questId: string): Promise<QuestWithVerifiers> {
    // This would fetch from your quests service/repository
    // Placeholder implementation - replace with actual database query
    return Promise.resolve({
      id: questId,
      verifiers: [],
      createdBy: '',
    });
  }

  /**
   * Check if user has admin role
   * TODO: Implement actual role checking logic
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private checkAdminRole(userId: string): Promise<boolean> {
    // Implement your role checking logic here
    // This would typically check against a users or roles table
    // Placeholder implementation - replace with actual database query
    return Promise.resolve(false);
  }

  /**
   * Get submission by ID with full details
   */
  async findOne(submissionId: string): Promise<Submission> {
    const submission = await this.submissionsRepository.findOne({
      where: { id: submissionId },
      relations: ['quest', 'user'],
    });

    if (!submission) {
      throw new NotFoundException(
        `Submission with ID ${submissionId} not found`,
      );
    }

    return submission;
  }

  /**
   * Get all submissions for a quest
   */
  async findByQuest(questId: string): Promise<Submission[]> {
    return this.submissionsRepository.find({
      where: { quest: { id: questId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }
}
