// Game System Tests — Dojo 1.8.0
#[cfg(test)]
mod tests {
    use starknet::ContractAddress;
    use dojo::model::ModelStorage;
    use dojo::world::{WorldStorage, WorldStorageTrait};
    use dojo_cairo_test::{
        spawn_test_world, NamespaceDef, TestResource, ContractDef, ContractDefTrait,
        WorldStorageTestTrait,
    };

    use memorabilia::models::game_state::{GameState, GameStatus, m_GameState};
    use memorabilia::models::game_cards::{GameCards, m_GameCards};
    use memorabilia::systems::game_system_simple::{
        game_system, IGameSystemDispatcher, IGameSystemDispatcherTrait,
    };

    fn namespace_def() -> NamespaceDef {
        NamespaceDef {
            namespace: "memorabilia",
            resources: [
                TestResource::Model(m_GameState::TEST_CLASS_HASH),
                TestResource::Model(m_GameCards::TEST_CLASS_HASH),
                TestResource::Contract(
                    ContractDefTrait::new(game_system::TEST_CLASS_HASH, "game_system")
                        .with_writer_of([dojo::utils::bytearray_hash(@"memorabilia")].span())
                ),
            ].span(),
        }
    }

    fn setup() -> (WorldStorage, IGameSystemDispatcher) {
        let world = spawn_test_world([namespace_def()].span());
        let (contract_address, _) = world.dns(@"game_system").unwrap();
        let game_system = IGameSystemDispatcher { contract_address };
        (world, game_system)
    }

    #[test]
    fn test_start_game_easy() {
        let (_, game_system) = setup();

        let game_id = game_system.start_game(1_u8);
        let game = game_system.get_game(game_id);

        assert(game.difficulty == 1, 'Wrong difficulty');
        assert(game.total_pairs == 4, 'Wrong pair count');
        assert(game.total_cards == 8, 'Wrong card count');
        assert(game.status == GameStatus::Active, 'Game not active');
        assert(game.matched_count == 0, 'No matches yet');
    }

    #[test]
    fn test_start_game_medium() {
        let (_, game_system) = setup();

        let game_id = game_system.start_game(2_u8);
        let game = game_system.get_game(game_id);

        assert(game.difficulty == 2, 'Wrong difficulty');
        assert(game.total_pairs == 8, 'Wrong pair count');
        assert(game.total_cards == 16, 'Wrong card count');
    }

    #[test]
    fn test_start_game_hard() {
        let (_, game_system) = setup();

        let game_id = game_system.start_game(3_u8);
        let game = game_system.get_game(game_id);

        assert(game.difficulty == 3, 'Wrong difficulty');
        assert(game.total_pairs == 12, 'Wrong pair count');
        assert(game.total_cards == 24, 'Wrong card count');
    }

    #[test]
    #[should_panic(expected: ('Invalid difficulty', 'ENTRYPOINT_FAILED'))]
    fn test_invalid_difficulty() {
        let (_, game_system) = setup();
        game_system.start_game(0_u8);
    }

    #[test]
    fn test_flip_card() {
        let (mut world, game_system) = setup();

        let game_id = game_system.start_game(1_u8);
        game_system.flip_card(game_id, 0_u8);

        let card: GameCards = world.read_model((game_id, 0_u8));
        assert(card.is_flipped, 'Card should be flipped');
    }

    #[test]
    fn test_flip_two_cards_then_unflip() {
        let (mut world, game_system) = setup();

        let game_id = game_system.start_game(1_u8);
        game_system.flip_card(game_id, 0_u8);
        game_system.flip_card(game_id, 1_u8);

        let card0: GameCards = world.read_model((game_id, 0_u8));
        let card1: GameCards = world.read_model((game_id, 1_u8));

        assert(card0.is_flipped, 'Card 0 should be flipped');
        assert(card1.is_flipped, 'Card 1 should be flipped');
    }

    #[test]
    fn test_game_state_persists() {
        let (mut world, game_system) = setup();

        let game_id = game_system.start_game(1_u8);
        let game: GameState = world.read_model(game_id);

        assert(game.game_id == game_id, 'Game id mismatch');
        assert(game.moves == 0, 'No moves yet');
        assert(game.score == 0, 'No score yet');
    }
}
