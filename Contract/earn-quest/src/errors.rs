use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    QuestAlreadyExists = 1,
    QuestNotFound = 2,
    QuestFull = 3,
    QuestExpired = 4,
    QuestNotActive = 5,
    InvalidRewardAmount = 6,
    InvalidParticipantLimit = 7,
    Unauthorized = 8,
    SubmissionNotFound = 9,
    SubmissionAlreadyExists = 10,
    InvalidSubmissionStatus = 11,
    UserStatsNotFound = 12,
}
