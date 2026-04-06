// Account Registry Tests — Dojo 1.8.0
#[cfg(test)]
mod tests {
    use starknet::ContractAddress;
    use dojo::model::ModelStorage;
    use dojo::world::{WorldStorage, WorldStorageTrait};
    use dojo_cairo_test::{
        spawn_test_world, NamespaceDef, TestResource, ContractDef, ContractDefTrait,
        WorldStorageTestTrait,
    };

    use memorabilia::models::user_account::{UserAccount, m_UserAccount};
    use memorabilia::models::session_policy::{SessionPolicy, m_SessionPolicy};
    use memorabilia::systems::account_registry::{
        account_registry, IAccountRegistryDispatcher, IAccountRegistryDispatcherTrait,
    };

    fn namespace_def() -> NamespaceDef {
        NamespaceDef {
            namespace: "memorabilia",
            resources: [
                TestResource::Model(m_UserAccount::TEST_CLASS_HASH),
                TestResource::Model(m_SessionPolicy::TEST_CLASS_HASH),
                TestResource::Contract(
                    ContractDefTrait::new(account_registry::TEST_CLASS_HASH, "account_registry")
                        .with_writer_of([dojo::utils::bytearray_hash(@"memorabilia")].span())
                ),
            ].span(),
        }
    }

    fn setup() -> (WorldStorage, IAccountRegistryDispatcher) {
        let world = spawn_test_world([namespace_def()].span());
        let (contract_address, _) = world.dns(@"account_registry").unwrap();
        let registry = IAccountRegistryDispatcher { contract_address };
        (world, registry)
    }

    #[test]
    fn test_register_account() {
        let (mut world, registry) = setup();

        let telegram_id: felt252 = 123456789;
        let owner_key: felt252 = 'owner_key';
        let session_key: felt252 = 'session_key';

        let account_address = registry.register_account(telegram_id, owner_key, session_key);

        assert(!account_address.is_zero(), 'Address should not be zero');

        let account: UserAccount = world.read_model(telegram_id);
        assert(account.telegram_id == telegram_id, 'Wrong telegram_id');
        assert(account.owner_public_key == owner_key, 'Wrong owner key');
        assert(account.session_public_key == session_key, 'Wrong session key');
        assert(account.is_active, 'Account should be active');
        assert(account.total_games == 0, 'Should have 0 games');
    }

    #[test]
    #[should_panic(expected: ('Account already registered', 'ENTRYPOINT_FAILED'))]
    fn test_cannot_register_twice() {
        let (_, registry) = setup();

        let telegram_id: felt252 = 123456789;
        registry.register_account(telegram_id, 'owner_key', 'session_key');
        registry.register_account(telegram_id, 'owner_key', 'session_key');
    }

    #[test]
    fn test_update_session_key() {
        let (mut world, registry) = setup();

        let telegram_id: felt252 = 123456789;
        let new_session_key: felt252 = 'new_session_key';

        registry.register_account(telegram_id, 'owner_key', 'session_key');
        registry.update_session_key(telegram_id, new_session_key);

        let account: UserAccount = world.read_model(telegram_id);
        assert(account.session_public_key == new_session_key, 'Session key not updated');
        assert(account.nonce == 1, 'Nonce should increment');
    }

    #[test]
    fn test_is_account_registered() {
        let (_, registry) = setup();

        let telegram_id: felt252 = 123456789;
        let unregistered_id: felt252 = 987654321;

        assert(!registry.is_account_registered(unregistered_id), 'Should not be registered');

        registry.register_account(telegram_id, 'owner', 'session');

        assert(registry.is_account_registered(telegram_id), 'Should be registered');
        assert(!registry.is_account_registered(unregistered_id), 'Still unregistered');
    }

    #[test]
    fn test_create_session_policy() {
        let (mut world, registry) = setup();

        let telegram_id: felt252 = 123456789;
        let account_address = registry.register_account(telegram_id, 'owner', 'session');

        let max_fee: u128 = 1_000_000;
        let expires_at: u64 = 9_999_999_999;

        registry.create_session_policy(telegram_id, max_fee, expires_at);

        let policy: SessionPolicy = world.read_model(account_address);
        assert(policy.is_active, 'Policy should be active');
        assert(policy.expires_at == expires_at, 'Wrong expiry');
        assert(policy.max_fee == max_fee, 'Wrong max fee');
    }
}
