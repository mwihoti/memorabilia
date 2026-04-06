// Memorabilia — On-Chain Memory Game on Starknet (Dojo 1.8.0)

// Models
pub mod models {
    pub mod user_account;
    pub mod session_policy;
    pub mod game_state;
    pub mod game_cards;
    pub mod card;
    pub mod leaderboard;
    pub mod player_limits;
    pub mod score_nft;
}

// Systems
pub mod systems {
    pub mod account_registry;
    pub mod game_system_simple;
    pub mod leaderboard_system;
    pub mod nft_system;
    pub mod greeting_system;
    pub mod cartridge_controller;
}

// Utilities
pub mod utils {
    pub mod card_generator;
    pub mod random;
    pub mod scoring;
}

// Tests
#[cfg(test)]
pub mod tests {
    pub mod test_game_system;
    pub mod test_account_registry;
    pub mod test_leaderboard;
    pub mod test_nft_system;
}
