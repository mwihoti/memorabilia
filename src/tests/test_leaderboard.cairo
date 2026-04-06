// Leaderboard Tests — Dojo 1.8.0
#[cfg(test)]
mod tests {
    use starknet::{ContractAddress, contract_address_const};
    use dojo::model::ModelStorage;
    use dojo::world::{WorldStorage, WorldStorageTrait};
    use dojo_cairo_test::{
        spawn_test_world, NamespaceDef, TestResource, ContractDef, ContractDefTrait,
        WorldStorageTestTrait,
    };

    use memorabilia::models::leaderboard::{LeaderboardEntry, PlayerStats, m_LeaderboardEntry, m_PlayerStats};
    use memorabilia::systems::leaderboard_system::{
        leaderboard_system, ILeaderboardSystemDispatcher, ILeaderboardSystemDispatcherTrait,
    };

    fn namespace_def() -> NamespaceDef {
        NamespaceDef {
            namespace: "memorabilia",
            resources: [
                TestResource::Model(m_LeaderboardEntry::TEST_CLASS_HASH),
                TestResource::Model(m_PlayerStats::TEST_CLASS_HASH),
                TestResource::Contract(
                    ContractDefTrait::new(leaderboard_system::TEST_CLASS_HASH, "leaderboard_system")
                        .with_writer_of([dojo::utils::bytearray_hash(@"memorabilia")].span())
                ),
            ].span(),
        }
    }

    fn setup() -> (WorldStorage, ILeaderboardSystemDispatcher) {
        let world = spawn_test_world([namespace_def()].span());
        let (contract_address, _) = world.dns(@"leaderboard_system").unwrap();
        let leaderboard = ILeaderboardSystemDispatcher { contract_address };
        (world, leaderboard)
    }

    #[test]
    fn test_submit_score() {
        let (mut world, leaderboard) = setup();

        let telegram_id: felt252 = 123456789;
        let score: u32 = 15_000;

        leaderboard.submit_score(1, telegram_id, score, 3_u8, 24, 120);

        let caller = starknet::get_caller_address();
        let stats: PlayerStats = world.read_model(caller);

        assert(stats.total_games == 1, 'Wrong game count');
        assert(stats.total_wins == 1, 'Wrong win count');
        assert(stats.best_score == score, 'Wrong best score');
    }

    #[test]
    fn test_player_stats_update() {
        let (mut world, leaderboard) = setup();

        let telegram_id: felt252 = 123456789;

        leaderboard.submit_score(1, telegram_id, 10_000, 2_u8, 20, 150);
        leaderboard.submit_score(2, telegram_id, 15_000, 3_u8, 24, 120);

        let caller = starknet::get_caller_address();
        let stats: PlayerStats = world.read_model(caller);

        assert(stats.total_games == 2, 'Should have 2 games');
        assert(stats.best_score == 15_000, 'Best score should update');
        assert(stats.best_time == 120, 'Best time should update');
    }

    #[test]
    fn test_leaderboard_entry_rank_one() {
        let (mut world, leaderboard) = setup();

        let telegram_id: felt252 = 123456789;
        let score: u32 = 15_000;

        leaderboard.submit_score(1, telegram_id, score, 3_u8, 24, 120);

        // First score should be rank 1 (slot was empty)
        let entry: LeaderboardEntry = world.read_model(1_u32);
        assert(!entry.player.is_zero(), 'Entry should exist');
        assert(entry.score == score, 'Wrong score');
        assert(entry.difficulty == 3, 'Wrong difficulty');
        assert(entry.rank == 1, 'Wrong rank');
    }

    #[test]
    fn test_player_stats_difficulty_breakdown() {
        let (mut world, leaderboard) = setup();

        let telegram_id: felt252 = 123456789;

        leaderboard.submit_score(1, telegram_id, 10_000, 1_u8, 12, 90);   // easy
        leaderboard.submit_score(2, telegram_id, 12_000, 2_u8, 20, 120);  // medium
        leaderboard.submit_score(3, telegram_id, 15_000, 3_u8, 24, 150);  // hard

        let caller = starknet::get_caller_address();
        let stats: PlayerStats = world.read_model(caller);

        assert(stats.total_games == 3, 'Should have 3 games');

        let (easy, medium, hard) = stats.games_by_difficulty;
        assert(easy == 1, 'Wrong easy count');
        assert(medium == 1, 'Wrong medium count');
        assert(hard == 1, 'Wrong hard count');
    }
}
