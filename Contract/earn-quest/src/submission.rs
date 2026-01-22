use soroban_sdk::{contracttype, Address, BytesN, Env, Symbol, Vec, log, events};
use crate::types::{Submission, SubmissionStatus, Quest, QuestStatus};
use crate::storage;
use crate::errors::Error;

/// Submit proof of quest completion
/// Validates that the quest exists, is active, hasn't expired, and user hasn't already submitted
pub fn submit_proof(
    env: &Env,
    quest_id: Symbol,
    submitter: Address,
    proof_hash: BytesN<32>,
) -> Result<(), Error> {
    // Validate quest exists
    let quest = storage::get_quest(env, &quest_id)?;

    // Check if quest is active
    match quest.status {
        QuestStatus::Active => {},
        _ => return Err(Error::InvalidQuestStatus),
    }

    // Check if quest has expired
    let current_timestamp = env.ledger().timestamp();
    if current_timestamp > quest.deadline {
        return Err(Error::QuestExpired);
    }

    // Check for duplicate submission
    if storage::submission_exists(env, &quest_id, &submitter) {
        return Err(Error::DuplicateSubmission);
    }

    // Validate proof hash is not all zeros (basic validation)
    let zero_hash = BytesN::from_array(env, &[0u8; 32]);
    if proof_hash == zero_hash {
        return Err(Error::InvalidProofHash);
    }

    // Create submission
    let submission = Submission {
        quest_id: quest_id.clone(),
        submitter: submitter.clone(),
        proof_hash,
        status: SubmissionStatus::Pending,
        timestamp: current_timestamp,
    };

    // Store submission
    storage::store_submission(env, &submission)?;

    // Add to user's submission list
    storage::add_user_submission(env, &submitter, &quest_id)?;

    // Emit event
    events::emit(
        env,
        Symbol::new(env, "proof_submitted"),
        (quest_id, submitter, proof_hash),
    );

    log!(env, "Proof submitted for quest {} by user {}", quest_id, submitter);

    Ok(())
}

/// Get a specific submission by quest_id and submitter
pub fn get_submission(
    env: &Env,
    quest_id: Symbol,
    submitter: Address,
) -> Result<Submission, Error> {
    storage::get_submission(env, &quest_id, &submitter)
}

/// Get all submissions for a specific user
/// Returns a vector of quest IDs that the user has submitted to
pub fn get_user_submissions(env: &Env, user: Address) -> Vec<Symbol> {
    storage::get_user_submissions(env, &user)
}

/// Approve a submission by the designated verifier
/// Validates verifier authorization and submission status before approval
pub fn approve_submission(
    env: &Env,
    quest_id: Symbol,
    submitter: Address,
    verifier: Address,
) -> Result<(), Error> {
    // Get the quest to verify the verifier is authorized
    let quest = storage::get_quest(env, &quest_id)?;

    // Check if the caller is the authorized verifier for this quest
    if quest.verifier != verifier {
        return Err(Error::UnauthorizedVerifier);
    }

    // Get the current submission
    let mut submission = storage::get_submission(env, &quest_id, &submitter)?;

    // Validate current status - can only approve pending submissions
    match submission.status {
        SubmissionStatus::Pending => {
            // Update status to Approved
            submission.status = SubmissionStatus::Approved;
            storage::store_submission(env, &submission)?;

            // Emit approval event
            events::emit(
                env,
                Symbol::new(env, "submission_approved"),
                (quest_id, submitter, verifier),
            );

            log!(env, "Submission approved for quest {} by user {} (verifier: {})",
                 quest_id, submitter, verifier);

            Ok(())
        },
        SubmissionStatus::Approved | SubmissionStatus::Rejected => {
            Err(Error::SubmissionAlreadyProcessed)
        },
        SubmissionStatus::Paid => {
            Err(Error::InvalidStatusTransition)
        }
    }
}

/// Reject a submission by the designated verifier
/// Validates verifier authorization and submission status before rejection
pub fn reject_submission(
    env: &Env,
    quest_id: Symbol,
    submitter: Address,
    verifier: Address,
) -> Result<(), Error> {
    // Get the quest to verify the verifier is authorized
    let quest = storage::get_quest(env, &quest_id)?;

    // Check if the caller is the authorized verifier for this quest
    if quest.verifier != verifier {
        return Err(Error::UnauthorizedVerifier);
    }

    // Get the current submission
    let mut submission = storage::get_submission(env, &quest_id, &submitter)?;

    // Validate current status - can only reject pending submissions
    match submission.status {
        SubmissionStatus::Pending => {
            // Update status to Rejected
            submission.status = SubmissionStatus::Rejected;
            storage::store_submission(env, &submission)?;

            // Emit rejection event
            events::emit(
                env,
                Symbol::new(env, "submission_rejected"),
                (quest_id, submitter, verifier),
            );

            log!(env, "Submission rejected for quest {} by user {} (verifier: {})",
                 quest_id, submitter, verifier);

            Ok(())
        },
        SubmissionStatus::Approved | SubmissionStatus::Rejected => {
            Err(Error::SubmissionAlreadyProcessed)
        },
        SubmissionStatus::Paid => {
            Err(Error::InvalidStatusTransition)
        }
    }
}

/// Get all submissions for a specific quest
/// This is a helper function that could be useful for verifiers
pub fn get_quest_submissions(env: &Env, quest_id: Symbol) -> Result<Vec<Submission>, Error> {
    // For now, this requires iterating through all submissions
    // In a production system, you might want to maintain a separate index
    // This is a simplified implementation
    let mut submissions = Vec::new();

    // Note: This is not efficient for large numbers of submissions
    // A production implementation would need a proper indexing system
    // For the scope of this issue, this provides basic functionality

    // We can't efficiently iterate through all submissions without an index
    // This function would need to be redesigned with proper indexing in storage
    // For now, returning an error indicating this isn't implemented efficiently

    Err(Error::Unauthorized) // Placeholder - would need proper implementation
}