#![cfg(test)]
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, BytesN, Env, Symbol, Vec,
};
use crate::types::{Quest, QuestStatus, Submission, SubmissionStatus};
use crate::storage;
use crate::submission;
use crate::errors::Error;

// Helper function to create a test quest
fn create_test_quest(env: &Env, quest_id: Symbol, deadline_offset: i64) -> Quest {
    Quest {
        id: quest_id,
        creator: Address::generate(env),
        reward_asset: Address::generate(env),
        reward_amount: 1000,
        verifier: Address::generate(env),
        deadline: (env.ledger().timestamp() as i64 + deadline_offset) as u64,
        status: QuestStatus::Active,
        total_claims: 0,
    }
}

// Helper function to create a test submission
fn create_test_submission(
    env: &Env,
    quest_id: Symbol,
    submitter: Address,
    status: SubmissionStatus
) -> Submission {
    Submission {
        quest_id,
        submitter,
        proof_hash: BytesN::from_array(env, &[1; 32]),
        status,
        timestamp: env.ledger().timestamp(),
    }
}

#[test]
fn test_successful_approval() {
    let env = Env::default();

    // Setup test data
    let quest_id = Symbol::new(&env, "quest1");
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    // Create and store quest
    let quest = create_test_quest(&env, quest_id, 86400);
    let verifier = quest.verifier.clone();
    storage::store_quest(&env, &quest).unwrap();

    // Submit proof
    submission::submit_proof(&env, quest_id, submitter, proof_hash).unwrap();

    // Approve submission - should succeed
    let result = submission::approve_submission(&env, quest_id, submitter, verifier);
    assert!(result.is_ok());

    // Verify submission status changed to Approved
    let updated_submission = storage::get_submission(&env, &quest_id, &submitter).unwrap();
    assert_eq!(updated_submission.status, SubmissionStatus::Approved);
}

#[test]
fn test_successful_rejection() {
    let env = Env::default();

    // Setup test data
    let quest_id = Symbol::new(&env, "quest2");
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    // Create and store quest
    let quest = create_test_quest(&env, quest_id, 86400);
    let verifier = quest.verifier.clone();
    storage::store_quest(&env, &quest).unwrap();

    // Submit proof
    submission::submit_proof(&env, quest_id, submitter, proof_hash).unwrap();

    // Reject submission - should succeed
    let result = submission::reject_submission(&env, quest_id, submitter, verifier);
    assert!(result.is_ok());

    // Verify submission status changed to Rejected
    let updated_submission = storage::get_submission(&env, &quest_id, &submitter).unwrap();
    assert_eq!(updated_submission.status, SubmissionStatus::Rejected);
}

#[test]
fn test_unauthorized_verifier_approval() {
    let env = Env::default();

    // Setup test data
    let quest_id = Symbol::new(&env, "quest3");
    let submitter = Address::generate(&env);
    let unauthorized_verifier = Address::generate(&env); // Different from quest verifier
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    // Create and store quest
    let quest = create_test_quest(&env, quest_id, 86400);
    storage::store_quest(&env, &quest).unwrap();

    // Submit proof
    submission::submit_proof(&env, quest_id, submitter, proof_hash).unwrap();

    // Try to approve with unauthorized verifier - should fail
    let result = submission::approve_submission(&env, quest_id, submitter, unauthorized_verifier);
    assert_eq!(result, Err(Error::UnauthorizedVerifier));
}

#[test]
fn test_unauthorized_verifier_rejection() {
    let env = Env::default();

    // Setup test data
    let quest_id = Symbol::new(&env, "quest4");
    let submitter = Address::generate(&env);
    let unauthorized_verifier = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    // Create and store quest
    let quest = create_test_quest(&env, quest_id, 86400);
    storage::store_quest(&env, &quest).unwrap();

    // Submit proof
    submission::submit_proof(&env, quest_id, submitter, proof_hash).unwrap();

    // Try to reject with unauthorized verifier - should fail
    let result = submission::reject_submission(&env, quest_id, submitter, unauthorized_verifier);
    assert_eq!(result, Err(Error::UnauthorizedVerifier));
}

#[test]
fn test_approve_nonexistent_submission() {
    let env = Env::default();

    let quest_id = Symbol::new(&env, "nonexistent");
    let submitter = Address::generate(&env);
    let verifier = Address::generate(&env);

    // Try to approve non-existent submission - should fail
    let result = submission::approve_submission(&env, quest_id, submitter, verifier);
    assert_eq!(result, Err(Error::SubmissionNotFound));
}

#[test]
fn test_reject_nonexistent_submission() {
    let env = Env::default();

    let quest_id = Symbol::new(&env, "nonexistent");
    let submitter = Address::generate(&env);
    let verifier = Address::generate(&env);

    // Try to reject non-existent submission - should fail
    let result = submission::reject_submission(&env, quest_id, submitter, verifier);
    assert_eq!(result, Err(Error::SubmissionNotFound));
}

#[test]
fn test_approve_nonexistent_quest() {
    let env = Env::default();

    let quest_id = Symbol::new(&env, "nonexistent_quest");
    let submitter = Address::generate(&env);
    let verifier = Address::generate(&env);

    // Try to approve submission for non-existent quest - should fail
    let result = submission::approve_submission(&env, quest_id, submitter, verifier);
    assert_eq!(result, Err(Error::QuestNotFound));
}

#[test]
fn test_reject_nonexistent_quest() {
    let env = Env::default();

    let quest_id = Symbol::new(&env, "nonexistent_quest");
    let submitter = Address::generate(&env);
    let verifier = Address::generate(&env);

    // Try to reject submission for non-existent quest - should fail
    let result = submission::reject_submission(&env, quest_id, submitter, verifier);
    assert_eq!(result, Err(Error::QuestNotFound));
}

#[test]
fn test_approve_already_approved_submission() {
    let env = Env::default();

    // Setup test data
    let quest_id = Symbol::new(&env, "quest5");
    let submitter = Address::generate(&env);

    // Create and store quest
    let quest = create_test_quest(&env, quest_id, 86400);
    let verifier = quest.verifier.clone();
    storage::store_quest(&env, &quest).unwrap();

    // Create and store an already approved submission
    let approved_submission = create_test_submission(&env, quest_id, submitter, SubmissionStatus::Approved);
    storage::store_submission(&env, &approved_submission).unwrap();

    // Try to approve already approved submission - should fail
    let result = submission::approve_submission(&env, quest_id, submitter, verifier);
    assert_eq!(result, Err(Error::SubmissionAlreadyProcessed));
}

#[test]
fn test_reject_already_rejected_submission() {
    let env = Env::default();

    // Setup test data
    let quest_id = Symbol::new(&env, "quest6");
    let submitter = Address::generate(&env);

    // Create and store quest
    let quest = create_test_quest(&env, quest_id, 86400);
    let verifier = quest.verifier.clone();
    storage::store_quest(&env, &quest).unwrap();

    // Create and store an already rejected submission
    let rejected_submission = create_test_submission(&env, quest_id, submitter, SubmissionStatus::Rejected);
    storage::store_submission(&env, &rejected_submission).unwrap();

    // Try to reject already rejected submission - should fail
    let result = submission::reject_submission(&env, quest_id, submitter, verifier);
    assert_eq!(result, Err(Error::SubmissionAlreadyProcessed));
}

#[test]
fn test_approve_paid_submission() {
    let env = Env::default();

    // Setup test data
    let quest_id = Symbol::new(&env, "quest7");
    let submitter = Address::generate(&env);

    // Create and store quest
    let quest = create_test_quest(&env, quest_id, 86400);
    let verifier = quest.verifier.clone();
    storage::store_quest(&env, &quest).unwrap();

    // Create and store a paid submission
    let paid_submission = create_test_submission(&env, quest_id, submitter, SubmissionStatus::Paid);
    storage::store_submission(&env, &paid_submission).unwrap();

    // Try to approve paid submission - should fail (invalid transition)
    let result = submission::approve_submission(&env, quest_id, submitter, verifier);
    assert_eq!(result, Err(Error::InvalidStatusTransition));
}

#[test]
fn test_reject_paid_submission() {
    let env = Env::default();

    // Setup test data
    let quest_id = Symbol::new(&env, "quest8");
    let submitter = Address::generate(&env);

    // Create and store quest
    let quest = create_test_quest(&env, quest_id, 86400);
    let verifier = quest.verifier.clone();
    storage::store_quest(&env, &quest).unwrap();

    // Create and store a paid submission
    let paid_submission = create_test_submission(&env, quest_id, submitter, SubmissionStatus::Paid);
    storage::store_submission(&env, &paid_submission).unwrap();

    // Try to reject paid submission - should fail (invalid transition)
    let result = submission::reject_submission(&env, quest_id, submitter, verifier);
    assert_eq!(result, Err(Error::InvalidStatusTransition));
}

#[test]
fn test_approval_rejection_workflow() {
    let env = Env::default();

    // Setup test data
    let quest_id = Symbol::new(&env, "quest9");
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    // Create and store quest
    let quest = create_test_quest(&env, quest_id, 86400);
    let verifier = quest.verifier.clone();
    storage::store_quest(&env, &quest).unwrap();

    // Submit proof - should be Pending initially
    submission::submit_proof(&env, quest_id, submitter, proof_hash).unwrap();
    let submission = storage::get_submission(&env, &quest_id, &submitter).unwrap();
    assert_eq!(submission.status, SubmissionStatus::Pending);

    // Approve submission
    submission::approve_submission(&env, quest_id, submitter, verifier).unwrap();
    let submission = storage::get_submission(&env, &quest_id, &submitter).unwrap();
    assert_eq!(submission.status, SubmissionStatus::Approved);

    // Try to reject already approved submission - should fail
    let result = submission::reject_submission(&env, quest_id, submitter, verifier);
    assert_eq!(result, Err(Error::SubmissionAlreadyProcessed));
}

#[test]
fn test_different_verifiers_for_different_quests() {
    let env = Env::default();

    // Setup two different quests with different verifiers
    let quest1_id = Symbol::new(&env, "quest10");
    let quest2_id = Symbol::new(&env, "quest11");
    let submitter = Address::generate(&env);
    let proof_hash = BytesN::from_array(&env, &[1; 32]);

    // Create and store quest1
    let quest1 = create_test_quest(&env, quest1_id, 86400);
    let verifier1 = quest1.verifier.clone();
    storage::store_quest(&env, &quest1).unwrap();

    // Create and store quest2
    let quest2 = create_test_quest(&env, quest2_id, 86400);
    let verifier2 = quest2.verifier.clone();
    storage::store_quest(&env, &quest2).unwrap();

    // Submit to both quests
    submission::submit_proof(&env, quest1_id, submitter, proof_hash).unwrap();
    submission::submit_proof(&env, quest2_id, submitter, proof_hash).unwrap();

    // Verifier1 can approve quest1 but not quest2
    let result1 = submission::approve_submission(&env, quest1_id, submitter, verifier1);
    assert!(result1.is_ok());

    let result2 = submission::approve_submission(&env, quest2_id, submitter, verifier1);
    assert_eq!(result2, Err(Error::UnauthorizedVerifier));

    // Verifier2 can approve quest2 but not quest1
    let result3 = submission::approve_submission(&env, quest2_id, submitter, verifier2);
    assert!(result3.is_ok());

    let result4 = submission::approve_submission(&env, quest1_id, submitter, verifier2);
    assert_eq!(result4, Err(Error::UnauthorizedVerifier));
}