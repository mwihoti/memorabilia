"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KATANA_ACCOUNTS = exports.EVENTS = exports.METHODS = exports.MODELS = exports.CONTRACTS = exports.dojoConfig = void 0;
exports.getKatanaAccount = getKatanaAccount;
exports.dojoConfig = {
    rpcUrl: import.meta.env.VITE_RPC_URL || 'http://localhost:5050',
    toriiUrl: import.meta.env.VITE_TORII_URL || 'http://localhost:8080',
    worldAddress: import.meta.env.VITE_WORLD_ADDRESS || '0x',
    network: import.meta.env.VITE_NETWORK || 'katana',
};
// Contract addresses and selectors
exports.CONTRACTS = {
    WORLD: exports.dojoConfig.worldAddress,
    ACCOUNT_REGISTRY: 'account_registry',
    GAME_SYSTEM: 'game_system',
    LEADERBOARD_SYSTEM: 'leaderboard_system',
    GREETING_SYSTEM: 'greeting_system',
};
// Model names
exports.MODELS = {
    USER_ACCOUNT: 'UserAccount',
    GAME_STATE: 'GameState',
    CARD: 'Card',
    SESSION_POLICY: 'SessionPolicy',
    LEADERBOARD_ENTRY: 'LeaderboardEntry',
    PLAYER_STATS: 'PlayerStats',
    GREETING: 'Greeting',
};
// System methods
exports.METHODS = {
    // Account Registry
    REGISTER_ACCOUNT: 'register_account',
    UPDATE_SESSION_KEY: 'update_session_key',
    CREATE_SESSION_POLICY: 'create_session_policy',
    GET_ACCOUNT: 'get_account',
    IS_ACCOUNT_REGISTERED: 'is_account_registered',
    // Game System
    START_GAME: 'start_game',
    FLIP_CARD: 'flip_card',
    CHECK_MATCH: 'check_match',
    GET_GAME: 'get_game',
    ABANDON_GAME: 'abandon_game',
    // Leaderboard System
    SUBMIT_SCORE: 'submit_score',
    GET_LEADERBOARD_ENTRY: 'get_leaderboard_entry',
    GET_PLAYER_STATS: 'get_player_stats',
    GET_PLAYER_RANK: 'get_player_rank',
    // Greeting System
    SET_GREETING: 'set_greeting',
    GET_GREETING: 'get_greeting',
};
// Event names
exports.EVENTS = {
    // Account Registry
    ACCOUNT_REGISTERED: 'AccountRegistered',
    SESSION_KEY_UPDATED: 'SessionKeyUpdated',
    SESSION_POLICY_CREATED: 'SessionPolicyCreated',
    // Game System
    GAME_STARTED: 'GameStarted',
    CARD_FLIPPED: 'CardFlipped',
    CARDS_MATCHED: 'CardsMatched',
    CARDS_MISMATCHED: 'CardsMismatched',
    GAME_COMPLETED: 'GameCompleted',
    // Leaderboard System
    LEADERBOARD_UPDATED: 'LeaderboardUpdated',
    PLAYER_STATS_UPDATED: 'PlayerStatsUpdated',
    // Greeting System
    GREETING_UPDATED: 'GreetingUpdated',
};
// Katana pre-funded accounts for development
exports.KATANA_ACCOUNTS = [
    {
        address: '0xb3ff441a68610b30fd5e2abbf3a1548eb6ba6f3559f2862bf2dc757e5828ca',
        privateKey: '0x2bbf4f9fd0bbb2e60b0316c1fe0b76cf7a4d0198bd493ced9b8df2a3a24d68a',
    },
    {
        address: '0xe29882a1fcba1e7e10cad46212257fea5c752a4f9b1b1ec683c503a2cf5c8a',
        privateKey: '0x14d6672dcb4b77ca36a887e9a11cd9d637d5012468175829e9c6e770c61642',
    },
];
function getKatanaAccount(index = 0) {
    return exports.KATANA_ACCOUNTS[index % exports.KATANA_ACCOUNTS.length];
}
