// NFT System — Dojo 1.8.0
// Mints on-chain score achievement NFTs (score >= 10_000 raw points).
use starknet::ContractAddress;
use memorabilia::models::score_nft::{ScoreNFT, ScoreNFTTrait, NFTCounter, NFTCounterTrait};

// ── Events ────────────────────────────────────────────────────────────────────

#[derive(Drop, Serde)]
#[dojo::event]
pub struct NFTMinted {
    #[key]
    pub token_id: u32,
    pub recipient: ContractAddress,
    pub score: u32,
    pub game_id: u32,
    pub difficulty: u8,
    pub timestamp: u64,
}

// ── Interface ─────────────────────────────────────────────────────────────────

#[starknet::interface]
pub trait INFTSystem<T> {
    fn mint_score_nft(
        ref self: T,
        recipient: ContractAddress,
        score: u32,
        timestamp: u64,
        game_id: u32,
        difficulty: u8,
    ) -> u32;

    fn get_nft(self: @T, token_id: u32) -> ScoreNFT;

    fn get_total_minted(self: @T) -> u32;
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[dojo::contract]
pub mod nft_system {
    use super::{ScoreNFT, ScoreNFTTrait, NFTCounter, NFTCounterTrait, NFTMinted, INFTSystem};
    use starknet::{ContractAddress, get_block_timestamp};
    use dojo::model::ModelStorage;
    use dojo::event::EventStorage;

    #[abi(embed_v0)]
    impl NFTSystemImpl of INFTSystem<ContractState> {
        fn mint_score_nft(
            ref self: ContractState,
            recipient: ContractAddress,
            score: u32,
            timestamp: u64,
            game_id: u32,
            difficulty: u8,
        ) -> u32 {
            let mut world = self.world_default();

            assert(ScoreNFTTrait::is_eligible(score), 'Score too low for NFT');
            assert(!recipient.is_zero(), 'Invalid recipient');

            // Singleton counter — keyed on id=0
            let mut counter: NFTCounter = world.read_model(0_u8);
            let token_id = counter.increment();
            world.write_model(@counter);

            let nft = ScoreNFTTrait::new(token_id, recipient, score, timestamp, game_id, difficulty);
            world.write_model(@nft);

            world.emit_event(@NFTMinted {
                token_id,
                recipient,
                score,
                game_id,
                difficulty,
                timestamp,
            });

            token_id
        }

        fn get_nft(self: @ContractState, token_id: u32) -> ScoreNFT {
            let world = self.world_default();
            world.read_model(token_id)
        }

        fn get_total_minted(self: @ContractState) -> u32 {
            let world = self.world_default();
            let counter: NFTCounter = world.read_model(0_u8);
            counter.total_minted
        }
    }
}
