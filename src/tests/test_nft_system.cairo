// NFT System Tests — Dojo 1.8.0
#[cfg(test)]
mod tests {
    use starknet::{ContractAddress, contract_address_const};
    use dojo::model::ModelStorage;
    use dojo::world::{WorldStorage, WorldStorageTrait};
    use dojo_cairo_test::{
        spawn_test_world, NamespaceDef, TestResource, ContractDef, ContractDefTrait,
        WorldStorageTestTrait,
    };

    use memorabilia::models::score_nft::{ScoreNFT, NFTCounter, m_ScoreNFT, m_NFTCounter};
    use memorabilia::systems::nft_system::{
        nft_system, INFTSystemDispatcher, INFTSystemDispatcherTrait,
    };

    fn namespace_def() -> NamespaceDef {
        NamespaceDef {
            namespace: "memorabilia",
            resources: [
                TestResource::Model(m_ScoreNFT::TEST_CLASS_HASH),
                TestResource::Model(m_NFTCounter::TEST_CLASS_HASH),
                TestResource::Contract(
                    ContractDefTrait::new(nft_system::TEST_CLASS_HASH, "nft_system")
                        .with_writer_of([dojo::utils::bytearray_hash(@"memorabilia")].span())
                ),
            ].span(),
        }
    }

    fn setup() -> (WorldStorage, INFTSystemDispatcher, ContractAddress) {
        let world = spawn_test_world([namespace_def()].span());
        let (contract_address, _) = world.dns(@"nft_system").unwrap();
        let nft_system = INFTSystemDispatcher { contract_address };
        let player = contract_address_const::<0x123>();
        (world, nft_system, player)
    }

    #[test]
    fn test_total_minted_initially_zero() {
        let (_, nft_system, _) = setup();
        assert(nft_system.get_total_minted() == 0, 'Initial total should be 0');
    }

    #[test]
    fn test_mint_nft_eligible_score() {
        let (mut world, nft_system, player) = setup();

        let token_id = nft_system.mint_score_nft(player, 12_000, 1_234_567_890, 1, 1_u8);

        assert(token_id == 1, 'Wrong token ID');

        let nft: ScoreNFT = world.read_model(token_id);
        assert(nft.recipient == player, 'Wrong recipient');
        assert(nft.score == 12_000, 'Wrong score');
        assert(nft.game_id == 1, 'Wrong game ID');
        assert(nft.difficulty == 1, 'Wrong difficulty');

        assert(nft_system.get_total_minted() == 1, 'Total should be 1');
    }

    #[test]
    #[should_panic(expected: ('Score too low for NFT', 'ENTRYPOINT_FAILED'))]
    fn test_mint_nft_low_score_panics() {
        let (_, nft_system, player) = setup();
        // score = 5_000 < 10_000 threshold
        nft_system.mint_score_nft(player, 5_000, 1_234_567_890, 1, 1_u8);
    }

    #[test]
    #[should_panic(expected: ('Invalid recipient', 'ENTRYPOINT_FAILED'))]
    fn test_mint_nft_zero_address_panics() {
        let (_, nft_system, _) = setup();
        nft_system.mint_score_nft(contract_address_const::<0x0>(), 15_000, 1_234_567_890, 1, 1_u8);
    }

    #[test]
    fn test_mint_multiple_nfts_sequential_ids() {
        let (mut world, nft_system, player) = setup();

        let id1 = nft_system.mint_score_nft(player, 12_000, 1_000, 1, 1_u8);
        let id2 = nft_system.mint_score_nft(player, 15_000, 2_000, 2, 2_u8);

        assert(id1 == 1, 'First token ID should be 1');
        assert(id2 == 2, 'Second token ID should be 2');
        assert(nft_system.get_total_minted() == 2, 'Total should be 2');

        let nft1: ScoreNFT = world.read_model(id1);
        let nft2: ScoreNFT = world.read_model(id2);
        assert(nft1.score == 12_000, 'Wrong first score');
        assert(nft2.score == 15_000, 'Wrong second score');
    }

    #[test]
    fn test_get_nft_via_dispatcher() {
        let (_, nft_system, player) = setup();

        let token_id = nft_system.mint_score_nft(player, 20_000, 9_999, 42, 3_u8);
        let nft = nft_system.get_nft(token_id);

        assert(nft.recipient == player, 'Wrong recipient');
        assert(nft.score == 20_000, 'Wrong score');
        assert(nft.timestamp == 9_999, 'Wrong timestamp');
        assert(nft.game_id == 42, 'Wrong game_id');
        assert(nft.difficulty == 3, 'Wrong difficulty');
    }
}
