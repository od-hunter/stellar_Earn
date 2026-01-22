
use soroban_sdk::{contracttype, Symbol};


pub enum Error {
    QuestAlreadyExists,
    QuestNotFound,
    InvalidRewardAmount,
    Unauthorized,
    InvalidQuestStatus,
    SubmissionNotFound,
    InvalidSubmissionStatus,
    BadgeAlreadyGranted,
    UserNotFound,
    DuplicateSubmission,
    QuestExpired,
    InvalidProofHash,
    UnauthorizedVerifier,
    InvalidStatusTransition,
    SubmissionAlreadyProcessed,
}
