// Account Registry — Dojo 1.8.0
use starknet::ContractAddress;
use memorabilia::models::user_account::{UserAccount, UserAccountTrait};
use memorabilia::models::session_policy::{SessionPolicy, SessionPolicyTrait};

// ── Events ────────────────────────────────────────────────────────────────────

#[derive(Drop, Serde)]
#[dojo::event]
pub struct AccountRegistered {
    #[key]
    pub telegram_id: felt252,
    pub account_address: ContractAddress,
    pub owner_public_key: felt252,
    pub timestamp: u64,
}

#[derive(Drop, Serde)]
#[dojo::event]
pub struct SessionKeyUpdated {
    #[key]
    pub telegram_id: felt252,
    pub new_session_key: felt252,
    pub timestamp: u64,
}

#[derive(Drop, Serde)]
#[dojo::event]
pub struct SessionPolicyCreated {
    #[key]
    pub account_address: ContractAddress,
    pub expires_at: u64,
}

// ── Interface ─────────────────────────────────────────────────────────────────

#[starknet::interface]
pub trait IAccountRegistry<T> {
    fn register_account(
        ref self: T,
        telegram_id: felt252,
        owner_public_key: felt252,
        session_public_key: felt252,
    ) -> ContractAddress;

    fn update_session_key(
        ref self: T,
        telegram_id: felt252,
        new_session_key: felt252,
    );

    fn create_session_policy(
        ref self: T,
        telegram_id: felt252,
        max_fee: u128,
        expires_at: u64,
    );

    fn get_account(self: @T, telegram_id: felt252) -> UserAccount;

    fn is_account_registered(self: @T, telegram_id: felt252) -> bool;
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[dojo::contract]
pub mod account_registry {
    use super::{
        UserAccount, UserAccountTrait,
        SessionPolicy, SessionPolicyTrait,
        AccountRegistered, SessionKeyUpdated, SessionPolicyCreated,
        IAccountRegistry,
    };
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use dojo::model::ModelStorage;
    use dojo::event::EventStorage;

    #[abi(embed_v0)]
    impl AccountRegistryImpl of IAccountRegistry<ContractState> {
        fn register_account(
            ref self: ContractState,
            telegram_id: felt252,
            owner_public_key: felt252,
            session_public_key: felt252,
        ) -> ContractAddress {
            let mut world = self.world_default();
            let timestamp = get_block_timestamp();
            let caller = get_caller_address();

            // Prevent duplicate registration
            let existing: UserAccount = world.read_model(telegram_id);
            assert(existing.telegram_id == 0, 'Account already registered');

            let account = UserAccountTrait::new(
                telegram_id,
                owner_public_key,
                session_public_key,
                caller,
                timestamp,
            );
            world.write_model(@account);

            world.emit_event(@AccountRegistered {
                telegram_id,
                account_address: caller,
                owner_public_key,
                timestamp,
            });

            caller
        }

        fn update_session_key(
            ref self: ContractState,
            telegram_id: felt252,
            new_session_key: felt252,
        ) {
            let mut world = self.world_default();
            let timestamp = get_block_timestamp();

            let mut account: UserAccount = world.read_model(telegram_id);
            assert(account.telegram_id != 0, 'Account not found');

            account.update_session_key(new_session_key);
            world.write_model(@account);

            world.emit_event(@SessionKeyUpdated {
                telegram_id,
                new_session_key,
                timestamp,
            });
        }

        fn create_session_policy(
            ref self: ContractState,
            telegram_id: felt252,
            max_fee: u128,
            expires_at: u64,
        ) {
            let mut world = self.world_default();

            let account: UserAccount = world.read_model(telegram_id);
            assert(account.telegram_id != 0, 'Account not found');

            let policy = SessionPolicyTrait::new(account.account_address, max_fee, expires_at);
            world.write_model(@policy);

            world.emit_event(@SessionPolicyCreated {
                account_address: account.account_address,
                expires_at,
            });
        }

        fn get_account(self: @ContractState, telegram_id: felt252) -> UserAccount {
            let world = self.world_default();
            world.read_model(telegram_id)
        }

        fn is_account_registered(self: @ContractState, telegram_id: felt252) -> bool {
            let world = self.world_default();
            let account: UserAccount = world.read_model(telegram_id);
            account.telegram_id != 0
        }
    }
}
