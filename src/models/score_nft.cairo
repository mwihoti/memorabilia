use starknet::ContractAddress;

/// NFT minted for high scores (score >= 10_000 raw points).
/// token_id uses u32 — u256 keys are not supported in Dojo 1.8.0.
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct ScoreNFT {
    #[key]
    pub token_id: u32,
    pub recipient: ContractAddress,
    pub score: u32,
    pub timestamp: u64,
    pub game_id: u32,
    pub difficulty: u8,
}

#[generate_trait]
pub impl ScoreNFTImpl of ScoreNFTTrait {
    fn new(
        token_id: u32,
        recipient: ContractAddress,
        score: u32,
        timestamp: u64,
        game_id: u32,
        difficulty: u8
    ) -> ScoreNFT {
        ScoreNFT { token_id, recipient, score, timestamp, game_id, difficulty }
    }

    fn is_eligible(score: u32) -> bool {
        score >= 10_000
    }
}

/// Track total NFTs minted — singleton keyed on id=0.
#[derive(Copy, Drop, Serde)]
#[dojo::model]
pub struct NFTCounter {
    #[key]
    pub id: u8,
    pub total_minted: u32,
}

#[generate_trait]
pub impl NFTCounterImpl of NFTCounterTrait {
    fn new() -> NFTCounter {
        NFTCounter { id: 0, total_minted: 0 }
    }

    fn increment(ref self: NFTCounter) -> u32 {
        self.total_minted += 1;
        self.total_minted
    }
}
