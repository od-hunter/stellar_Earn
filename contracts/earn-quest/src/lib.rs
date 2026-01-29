#![no_std]

mod admin;
pub mod errors;
mod events;
mod payout;
mod reputation;
pub mod storage;
pub mod types;

use crate::errors::Error;
use crate::types::{Badge, Quest, QuestStatus, Submission, SubmissionStatus, UserStats};
use soroban_sdk::{contract, contractimpl, Address, BytesN, Env, Symbol};

#[contract]
pub struct EarnQuestContract;

#[contractimpl]
impl EarnQuestContract {
    /// Initialize the contract with an initial admin
    pub fn initialize(env: Env, initial_admin: Address) -> Result<(), Error> {
        initial_admin.require_auth();
        storage::set_admin(&env, &initial_admin);
        Ok(())
    }

    /// Add a new admin (admin only)
    pub fn add_admin(env: Env, caller: Address, new_admin: Address) -> Result<(), Error> {
        admin::add_admin(&env, &caller, &new_admin)
    }

    /// Remove an admin (admin only)
    pub fn remove_admin(env: Env, caller: Address, admin_to_remove: Address) -> Result<(), Error> {
        admin::remove_admin(&env, &caller, &admin_to_remove)
    }

    /// Check if an address is an admin
    pub fn is_admin(env: Env, address: Address) -> bool {
        admin::is_admin(&env, &address)
    }

    /// Register a new quest
    pub fn register_quest(
        env: Env,
        id: Symbol,
        creator: Address,
        reward_asset: Address,
        reward_amount: i128,
        verifier: Address,
        deadline: u64,
    ) -> Result<(), Error> {
        creator.require_auth();

        if storage::has_quest(&env, &id) {
            return Err(Error::QuestAlreadyExists);
        }

        if reward_amount <= 0 {
            return Err(Error::InvalidRewardAmount);
        }

        let quest = Quest {
            id: id.clone(),
            creator: creator.clone(),
            reward_asset: reward_asset.clone(),
            reward_amount,
            verifier: verifier.clone(),
            deadline,
            status: QuestStatus::Active,
            total_claims: 0,
        };

        storage::set_quest(&env, &id, &quest);

        // EMIT EVENT: QuestRegistered
        events::quest_registered(
            &env,
            id,
            creator,
            reward_asset,
            reward_amount,
            verifier,
            deadline,
        );

        Ok(())
    }

    /// Submit proof
    pub fn submit_proof(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
        proof_hash: BytesN<32>,
    ) -> Result<(), Error> {
        submitter.require_auth();

        // Verify quest exists
        let _quest = storage::get_quest(&env, &quest_id)?;

        let submission = Submission {
            quest_id: quest_id.clone(),
            submitter: submitter.clone(),
            proof_hash: proof_hash.clone(),
            status: SubmissionStatus::Pending,
            timestamp: env.ledger().timestamp(),
        };

        storage::set_submission(&env, &quest_id, &submitter, &submission);

        // EMIT EVENT: ProofSubmitted
        events::proof_submitted(&env, quest_id, submitter, proof_hash);

        Ok(())
    }

    /// Approve submission (Internal/Verifier)
    pub fn approve_submission(
        env: Env,
        quest_id: Symbol,
        submitter: Address,
        verifier: Address,
    ) -> Result<(), Error> {
        // Auth check
        verifier.require_auth();

        let quest = storage::get_quest(&env, &quest_id)?;

        if verifier != quest.verifier {
            return Err(Error::Unauthorized);
        }

        let submission = storage::get_submission(&env, &quest_id, &submitter)?;

        // Only Pending can be approved
        if submission.status != SubmissionStatus::Pending {
            return Err(Error::InvalidSubmissionStatus);
        }

        storage::update_submission_status(&env, &quest_id, &submitter, SubmissionStatus::Approved)?;

        // EMIT EVENT: SubmissionApproved
        events::submission_approved(&env, quest_id, submitter, verifier);

        Ok(())
    }

    /// Claim approved reward for a completed quest
    pub fn claim_reward(env: Env, quest_id: Symbol, submitter: Address) -> Result<(), Error> {
        // 1. Auth
        submitter.require_auth();

        // 2. Data Retrieval
        let quest = storage::get_quest(&env, &quest_id)?;
        let submission = storage::get_submission(&env, &quest_id, &submitter)?;

        // 3. Validation
        if submission.status == SubmissionStatus::Paid {
            return Err(Error::AlreadyClaimed);
        }
        if submission.status != SubmissionStatus::Approved {
            return Err(Error::InvalidSubmissionStatus);
        }

        // 4. Payout
        // Logic handled in payout module (includes balance check)
        payout::transfer_reward(&env, &quest.reward_asset, &submitter, quest.reward_amount)?;

        // 5. State Update
        storage::update_submission_status(&env, &quest_id, &submitter, SubmissionStatus::Paid)?;
        storage::increment_quest_claims(&env, &quest_id)?;

        // EMIT EVENT: RewardClaimed
        events::reward_claimed(
            &env,
            quest_id.clone(),
            submitter.clone(),
            quest.reward_asset,
            quest.reward_amount,
        );

        // 6. Award XP for quest completion
        reputation::award_xp(&env, &submitter, 100)?;

        Ok(())
    }

    /// Get user reputation stats
    pub fn get_user_stats(env: Env, user: Address) -> UserStats {
        reputation::get_user_stats(&env, &user)
    }

    /// Grant a badge to a user (admin only)
    pub fn grant_badge(env: Env, admin: Address, user: Address, badge: Badge) -> Result<(), Error> {
        reputation::grant_badge(&env, &admin, &user, badge)
    }
}
