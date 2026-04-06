// Leaderboard System — Dojo 1.8.0
use starknet::ContractAddress;
use memorabilia::models::leaderboard::{LeaderboardEntry, LeaderboardEntryTrait, PlayerStats, PlayerStatsTrait};

// ── Events ────────────────────────────────────────────────────────────────────

#[derive(Drop, Serde)]
#[dojo::event]
pub struct LeaderboardUpdated {
    #[key]
    pub player: ContractAddress,
    pub new_rank: u32,
    pub score: u32,
}

#[derive(Drop, Serde)]
#[dojo::event]
pub struct PlayerStatsUpdated {
    #[key]
    pub player: ContractAddress,
    pub total_games: u32,
    pub best_score: u32,
}

// ── Interface ─────────────────────────────────────────────────────────────────

#[starknet::interface]
pub trait ILeaderboardSystem<T> {
    fn submit_score(
        ref self: T,
        game_id: u32,
        telegram_id: felt252,
        score: u32,
        difficulty: u8,
        moves: u32,
        time: u64,
    );
    fn get_leaderboard_entry(self: @T, rank: u32) -> LeaderboardEntry;
    fn get_player_stats(self: @T, player: ContractAddress) -> PlayerStats;
    fn get_player_rank(self: @T, player: ContractAddress) -> u32;
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[dojo::contract]
pub mod leaderboard_system {
    use super::{
        LeaderboardEntry, LeaderboardEntryTrait, PlayerStats, PlayerStatsTrait,
        LeaderboardUpdated, PlayerStatsUpdated, ILeaderboardSystem,
    };
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use dojo::model::ModelStorage;
    use dojo::event::EventStorage;

    #[abi(embed_v0)]
    impl LeaderboardSystemImpl of ILeaderboardSystem<ContractState> {
        fn submit_score(
            ref self: ContractState,
            game_id: u32,
            telegram_id: felt252,
            score: u32,
            difficulty: u8,
            moves: u32,
            time: u64,
        ) {
            let mut world = self.world_default();
            let player = get_caller_address();
            let timestamp = get_block_timestamp();

            // Read or initialise player stats
            let mut stats: PlayerStats = world.read_model(player);
            if stats.player.is_zero() {
                stats = PlayerStatsTrait::new(player);
            }
            stats.update_with_game(score, time, moves, difficulty);
            world.write_model(@stats);

            world.emit_event(@PlayerStatsUpdated {
                player,
                total_games: stats.total_games,
                best_score: stats.best_score,
            });

            // Determine insert rank and store entry if in top 100
            let rank = find_insert_rank(ref world, score);
            if rank >= 1 && rank <= 100 {
                let entry = LeaderboardEntryTrait::new(
                    rank, player, telegram_id, score, difficulty, moves, time, game_id, timestamp,
                );
                world.write_model(@entry);

                world.emit_event(@LeaderboardUpdated { player, new_rank: rank, score });
            }
        }

        fn get_leaderboard_entry(self: @ContractState, rank: u32) -> LeaderboardEntry {
            let world = self.world_default();
            world.read_model(rank)
        }

        fn get_player_stats(self: @ContractState, player: ContractAddress) -> PlayerStats {
            let world = self.world_default();
            world.read_model(player)
        }

        fn get_player_rank(self: @ContractState, player: ContractAddress) -> u32 {
            let world = self.world_default();
            let mut rank: u32 = 1;
            loop {
                if rank > 100 {
                    break 0_u32;
                }
                let entry: LeaderboardEntry = world.read_model(rank);
                if entry.player == player {
                    break rank;
                }
                rank += 1;
            }
        }
    }

    /// Find the rank slot where a new score should be inserted (1-based).
    /// Returns 0 if the score doesn't make the top 100.
    fn find_insert_rank(ref world: dojo::world::WorldStorage, new_score: u32) -> u32 {
        let mut rank: u32 = 1;
        loop {
            if rank > 100 {
                break 0_u32;
            }
            let entry: LeaderboardEntry = world.read_model(rank);
            if entry.player.is_zero() || new_score > entry.score {
                break rank;
            }
            rank += 1;
        }
    }
}
