# StellarEarn Smart Contract

> Soroban smart contract for quest-based earning and reputation on Stellar

## Overview

The StellarEarn smart contract is a Rust-based Soroban contract that manages quest registration, proof submission verification, reward distribution, and on-chain reputation tracking. It serves as the trust-minimized core of the StellarEarn platform, ensuring transparent and programmable reward payouts.

## Tech Stack

- **Language**: Rust
- **Platform**: Soroban (Stellar smart contracts)
- **SDK**: soroban-sdk
- **Testing**: Rust test framework + soroban-cli
- **Build Tool**: Cargo

## Features

- 📋 **Quest Registry** - Register quests with reward details and verification criteria
- ✅ **Proof Submission** - Store and validate proof of quest completion
- 🔐 **Access Control** - Role-based permissions for quest creators and verifiers
- 💰 **Automated Payouts** - Release rewards upon approval via Stellar assets
- ⭐ **Reputation System** - Track XP, levels, and badges per user address
- 🔒 **Escrow Logic** - Hold rewards until verification conditions are met
- 📊 **State Queries** - Retrieve quest details, user stats, and submission history
- 🔄 **Event Emission** - Emit events for indexing and off-chain monitoring

## Project Structure

```
contracts/earn-quest/
├── src/
│   ├── lib.rs                  # Contract entry point and main functions
│   ├── storage.rs              # Storage keys and helpers
│   ├── types.rs                # Custom types and structs
│   ├── quest.rs                # Quest management logic
│   ├── submission.rs           # Submission handling
│   ├── payout.rs               # Reward distribution
│   ├── reputation.rs           # XP and badge tracking
│   └── errors.rs               # Custom error types
├── tests/
│   ├── test_quest.rs           # Quest registration tests
│   ├── test_submission.rs      # Submission flow tests
│   ├── test_payout.rs          # Payout logic tests
│   └── test_reputation.rs      # Reputation system tests
├── Cargo.toml                  # Rust dependencies and metadata
├── Cargo.lock
└── README.md
```

## Getting Started

### Prerequisites

- Rust ≥ 1.74 (stable)
- Cargo
- Soroban CLI
- Stellar CLI (optional, for deployment)

### Installation

**Install Rust:**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
```

**Install Soroban CLI:**
```bash
cargo install --locked soroban-cli
```

Verify installation:
```bash
soroban version
```

### Clone and Build

```bash
# Navigate to contract directory
cd contracts/earn-quest

# Build the contract
cargo build --target wasm32-unknown-unknown --release

# Optimize WASM (optional but recommended)
soroban contract optimize --wasm target/wasm32-unknown-unknown/release/earn_quest.wasm
```

The optimized WASM file will be in `target/wasm32-unknown-unknown/release/earn_quest.optimized.wasm`.

## Contract Architecture

### Core Data Structures

```rust
// Quest structure
#[contracttype]
pub struct Quest {
    pub id: Symbol,
    pub creator: Address,
    pub reward_asset: Address,
    pub reward_amount: i128,
    pub verifier: Address,
    pub deadline: u64,
    pub status: QuestStatus,
    pub total_claims: u32,
}

// Submission structure
#[contracttype]
pub struct Submission {
    pub quest_id: Symbol,
    pub submitter: Address,
    pub proof_hash: BytesN<32>,
    pub status: SubmissionStatus,
    pub timestamp: u64,
}

// User reputation
#[contracttype]
pub struct UserStats {
    pub address: Address,
    pub total_xp: u32,
    pub level: u32,
    pub quests_completed: u32,
    pub badges: Vec<Symbol>,
}

// Enums
#[contracttype]
pub enum QuestStatus {
    Active,
    Paused,
    Completed,
    Expired,
}

#[contracttype]
pub enum SubmissionStatus {
    Pending,
    Approved,
    Rejected,
    Paid,
}
```

### Contract Functions

#### Quest Management

```rust
/// Register a new quest
pub fn register_quest(
    env: Env,
    id: Symbol,
    creator: Address,
    reward_asset: Address,
    reward_amount: i128,
    verifier: Address,
    deadline: u64,
) -> Result<(), Error>;

/// Get quest details
pub fn get_quest(env: Env, id: Symbol) -> Result<Quest, Error>;

/// Update quest status (admin only)
pub fn update_quest_status(
    env: Env,
    id: Symbol,
    caller: Address,
    status: QuestStatus,
) -> Result<(), Error>;
```

#### Submissions

```rust
/// Submit proof for a quest
pub fn submit_proof(
    env: Env,
    quest_id: Symbol,
    submitter: Address,
    proof_hash: BytesN<32>,
) -> Result<(), Error>;

/// Get submission details
pub fn get_submission(
    env: Env,
    quest_id: Symbol,
    submitter: Address,
) -> Result<Submission, Error>;
```

#### Verification & Payouts

```rust
/// Approve submission and trigger payout
pub fn approve_submission(
    env: Env,
    quest_id: Symbol,
    submitter: Address,
    verifier: Address,
) -> Result<(), Error>;

/// Reject submission
pub fn reject_submission(
    env: Env,
    quest_id: Symbol,
    submitter: Address,
    verifier: Address,
) -> Result<(), Error>;

/// Claim approved reward
pub fn claim_reward(
    env: Env,
    quest_id: Symbol,
    submitter: Address,
) -> Result<(), Error>;
```

#### Reputation

```rust
/// Get user statistics
pub fn get_user_stats(env: Env, address: Address) -> Result<UserStats, Error>;

/// Award XP to user (internal)
fn award_xp(env: &Env, address: &Address, xp: u32) -> Result<(), Error>;

/// Grant badge to user (admin only)
pub fn grant_badge(
    env: Env,
    address: Address,
    badge: Symbol,
    admin: Address,
) -> Result<(), Error>;
```

## Implementation Example

### Quest Registration

```rust
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, symbol_short};

#[contract]
pub struct EarnQuestContract;

#[contractimpl]
impl EarnQuestContract {
    pub fn register_quest(
        env: Env,
        id: Symbol,
        creator: Address,
        reward_asset: Address,
        reward_amount: i128,
        verifier: Address,
        deadline: u64,
    ) -> Result<(), Error> {
        // Verify creator authorization
        creator.require_auth();
        
        // Validate inputs
        if reward_amount <= 0 {
            return Err(Error::InvalidRewardAmount);
        }
        
        // Check quest doesn't already exist
        if storage::has_quest(&env, &id) {
            return Err(Error::QuestAlreadyExists);
        }
        
        // Create quest
        let quest = Quest {
            id: id.clone(),
            creator: creator.clone(),
            reward_asset: reward_asset.clone(),
            reward_amount,
            verifier,
            deadline,
            status: QuestStatus::Active,
            total_claims: 0,
        };
        
        // Store quest
        storage::set_quest(&env, &id, &quest);
        
        // Emit event
        env.events().publish((symbol_short!("quest_reg"), id), quest);
        
        Ok(())
    }
}
```

### Approval and Payout

```rust
pub fn approve_submission(
    env: Env,
    quest_id: Symbol,
    submitter: Address,
    verifier: Address,
) -> Result<(), Error> {
    // Verify verifier authorization
    verifier.require_auth();
    
    // Get quest
    let quest = storage::get_quest(&env, &quest_id)?;
    
    // Verify caller is the designated verifier
    if quest.verifier != verifier {
        return Err(Error::Unauthorized);
    }
    
    // Get submission
    let mut submission = storage::get_submission(&env, &quest_id, &submitter)?;
    
    // Check submission is pending
    if submission.status != SubmissionStatus::Pending {
        return Err(Error::InvalidSubmissionStatus);
    }
    
    // Update submission status
    submission.status = SubmissionStatus::Approved;
    storage::set_submission(&env, &quest_id, &submitter, &submission);
    
    // Transfer reward
    payout::transfer_reward(
        &env,
        &quest.reward_asset,
        &quest.creator,
        &submitter,
        quest.reward_amount,
    )?;
    
    // Update user stats
    reputation::award_xp(&env, &submitter, 100)?;
    
    // Update submission to paid
    submission.status = SubmissionStatus::Paid;
    storage::set_submission(&env, &quest_id, &submitter, &submission);
    
    // Emit event
    env.events().publish(
        (symbol_short!("approved"), quest_id.clone()),
        submitter.clone(),
    );
    
    Ok(())
}
```

## Testing

### Run Tests

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_register_quest

# Run with output
cargo test -- --nocapture

# Run with coverage (requires cargo-tarpaulin)
cargo tarpaulin --out Html
```

### Test Example

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    #[test]
    fn test_register_quest() {
        let env = Env::default();
        let contract_id = env.register_contract(None, EarnQuestContract);
        let client = EarnQuestContractClient::new(&env, &contract_id);
        
        let creator = Address::generate(&env);
        let verifier = Address::generate(&env);
        let reward_asset = Address::generate(&env);
        
        // Register quest
        client.register_quest(
            &symbol_short!("Q001"),
            &creator,
            &reward_asset,
            &1000,
            &verifier,
            &1000000,
        );
        
        // Verify quest was created
        let quest = client.get_quest(&symbol_short!("Q001"));
        assert_eq!(quest.reward_amount, 1000);
        assert_eq!(quest.status, QuestStatus::Active);
    }

    #[test]
    fn test_submission_flow() {
        let env = Env::default();
        let contract_id = env.register_contract(None, EarnQuestContract);
        let client = EarnQuestContractClient::new(&env, &contract_id);
        
        // Setup
        let creator = Address::generate(&env);
        let submitter = Address::generate(&env);
        let verifier = Address::generate(&env);
        let reward_asset = Address::generate(&env);
        
        // Register quest
        client.register_quest(/* ... */);
        
        // Submit proof
        let proof_hash = BytesN::from_array(&env, &[1u8; 32]);
        client.submit_proof(&symbol_short!("Q001"), &submitter, &proof_hash);
        
        // Approve
        client.approve_submission(&symbol_short!("Q001"), &submitter, &verifier);
        
        // Verify stats updated
        let stats = client.get_user_stats(&submitter);
        assert_eq!(stats.quests_completed, 1);
        assert!(stats.total_xp >= 100);
    }
}
```

## Deployment

### Deploy to Testnet

```bash
# Set network configuration
export STELLAR_NETWORK=testnet
export SOROBAN_RPC_URL=https://soroban-testnet.stellar.org

# Generate a new keypair (or use existing)
soroban keys generate --global deployer --network testnet

# Fund the account (get testnet tokens)
soroban keys address deployer
# Visit https://laboratory.stellar.org/#account-creator to fund

# Deploy contract
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/earn_quest.optimized.wasm \
  --source deployer \
  --network testnet

# Save the contract ID
export CONTRACT_ID=<output-contract-id>
```

### Deploy to Mainnet

```bash
# WARNING: Ensure thorough testing before mainnet deployment

export STELLAR_NETWORK=mainnet
export SOROBAN_RPC_URL=https://soroban-mainnet.stellar.org

# Use secure key management for mainnet
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/earn_quest.optimized.wasm \
  --source <mainnet-deployer> \
  --network mainnet
```

## Invoking Contract Functions

### CLI Examples

```bash
# Register a quest
soroban contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- \
  register_quest \
  --id Q001 \
  --creator <creator-address> \
  --reward_asset <asset-address> \
  --reward_amount 1000 \
  --verifier <verifier-address> \
  --deadline 1735689600

# Get quest details
soroban contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- \
  get_quest \
  --id Q001

# Submit proof
soroban contract invoke \
  --id $CONTRACT_ID \
  --source submitter \
  --network testnet \
  -- \
  submit_proof \
  --quest_id Q001 \
  --submitter <submitter-address> \
  --proof_hash <32-byte-hash>

# Get user stats
soroban contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- \
  get_user_stats \
  --address <user-address>
```

## Gas Optimization

- Use `symbol_short!` for small fixed strings (≤9 chars)
- Minimize storage reads/writes
- Batch operations when possible
- Use efficient data structures (prefer `Vec` over `Map` for small collections)
- Avoid unnecessary clones

## Security Considerations

- **Authorization**: Always verify caller identity with `require_auth()`
- **Input Validation**: Check all inputs for validity before processing
- **Reentrancy**: Soroban is inherently protected, but be cautious with external calls
- **Integer Overflow**: Use checked arithmetic operations
- **Access Control**: Implement proper role-based permissions
- **Upgradability**: Consider using a proxy pattern for contract upgrades

## Best Practices

- **Error Handling**: Define custom error types for clarity
- **Events**: Emit events for all state changes
- **Documentation**: Use Rust doc comments (`///`) for all public functions
- **Testing**: Aim for >80% code coverage
- **Gas Efficiency**: Profile and optimize expensive operations
- **Versioning**: Use semantic versioning for contract releases

## Troubleshooting

### Build Errors

- Ensure `wasm32-unknown-unknown` target is installed
- Update Rust toolchain: `rustup update stable`
- Clear build artifacts: `cargo clean`

### Deployment Failures

- Verify account has sufficient XLM for fees
- Check network connectivity to RPC endpoint
- Ensure WASM file is optimized and valid

### Function Invocation Errors

- Verify function signatures match contract implementation
- Check authorization (caller has required permissions)
- Ensure contract state is valid for the operation

## Resources

- [Soroban Documentation](https://developers.stellar.org/docs/smart-contracts)
- [Soroban SDK Docs](https://docs.rs/soroban-sdk/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [Stellar Laboratory](https://laboratory.stellar.org/)
- [Soroban Examples](https://github.com/stellar/soroban-examples)

## Contributing

Please see the main repository [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

### Contract Development Guidelines

- Follow Rust naming conventions (snake_case for functions/variables)
- Write comprehensive tests for all public functions
- Document complex logic with inline comments
- Use `rustfmt` for consistent code formatting
- Run `clippy` for linting: `cargo clippy`

## License

MIT - See [LICENSE](../../LICENSE) for details