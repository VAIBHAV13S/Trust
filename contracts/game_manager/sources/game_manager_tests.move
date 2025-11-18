/// Test suite for GameManager module
#[test_only]
module game_manager::game_manager_tests;

use game_manager::game_manager::{Self, Player, Match, GameRegistry};
use one::coin;
use one::test_scenario::{Self};
use std::vector;

// Test constants
const TEST_STAKE: u64 = 100;
const PLAYER1_ADDRESS: address = @0xA;
const PLAYER2_ADDRESS: address = @0xB;

// ============ Player Registration Tests ============

#[test]
fun test_player_registration() {
    let mut scenario = test_scenario::begin(PLAYER1_ADDRESS);
    
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut registry = GameRegistry {
            id: object::new(ctx),
            total_matches: 0,
            total_tournaments: 0,
            total_players: 0,
            admin: PLAYER1_ADDRESS,
        };
        
        game_manager::register_player(&mut registry, ctx);
        
        assert!(registry.total_players == 1, 0);
    };
    
    scenario.end();
}

#[test]
fun test_multiple_player_registrations() {
    let mut scenario = test_scenario::begin(PLAYER1_ADDRESS);
    
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut registry = GameRegistry {
            id: object::new(ctx),
            total_matches: 0,
            total_tournaments: 0,
            total_players: 0,
            admin: PLAYER1_ADDRESS,
        };
        
        game_manager::register_player(&mut registry, ctx);
        assert!(registry.total_players == 1, 1);
    };
    
    test_scenario::next_tx(&mut scenario, PLAYER2_ADDRESS);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut registry = test_scenario::take_shared(&mut scenario);
        
        game_manager::register_player(&mut registry, ctx);
        assert!(registry.total_players == 2, 2);
        
        test_scenario::return_shared(registry);
    };
    
    scenario.end();
}

// ============ Match Creation Tests ============

#[test]
fun test_match_creation() {
    let mut scenario = test_scenario::begin(PLAYER1_ADDRESS);
    
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut registry = GameRegistry {
            id: object::new(ctx),
            total_matches: 0,
            total_tournaments: 0,
            total_players: 0,
            admin: PLAYER1_ADDRESS,
        };
        
        game_manager::create_match(&mut registry, PLAYER1_ADDRESS, PLAYER2_ADDRESS, TEST_STAKE, ctx);
        
        assert!(registry.total_matches == 1, 3);
    };
    
    scenario.end();
}

// ============ Choice Commitment Tests ============

#[test]
fun test_commit_choice() {
    let mut scenario = test_scenario::begin(PLAYER1_ADDRESS);
    
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut registry = GameRegistry {
            id: object::new(ctx),
            total_matches: 0,
            total_tournaments: 0,
            total_players: 0,
            admin: PLAYER1_ADDRESS,
        };
        
        game_manager::create_match(&mut registry, PLAYER1_ADDRESS, PLAYER2_ADDRESS, TEST_STAKE, ctx);
    };
    
    test_scenario::next_tx(&mut scenario, PLAYER1_ADDRESS);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = test_scenario::take_shared(&mut scenario);
        
        // Create a commitment hash
        let mut choice_hash = vector::empty();
        vector::push_back(&mut choice_hash, 0); // Choice: COOPERATE
        // In real scenario, this would include salt for security
        
        game_manager::commit_choice(&mut match_obj, choice_hash, ctx);
        
        assert!(!vector::is_empty(&match_obj.player1_choice_hash), 4);
        
        test_scenario::return_shared(match_obj);
    };
    
    scenario.end();
}

#[test]
fun test_commit_both_players() {
    let mut scenario = test_scenario::begin(PLAYER1_ADDRESS);
    
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut registry = GameRegistry {
            id: object::new(ctx),
            total_matches: 0,
            total_tournaments: 0,
            total_players: 0,
            admin: PLAYER1_ADDRESS,
        };
        
        game_manager::create_match(&mut registry, PLAYER1_ADDRESS, PLAYER2_ADDRESS, TEST_STAKE, ctx);
    };
    
    test_scenario::next_tx(&mut scenario, PLAYER1_ADDRESS);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = test_scenario::take_shared(&mut scenario);
        
        let mut choice_hash1 = vector::empty();
        vector::push_back(&mut choice_hash1, 0);
        
        game_manager::commit_choice(&mut match_obj, choice_hash1, ctx);
        
        test_scenario::return_shared(match_obj);
    };
    
    test_scenario::next_tx(&mut scenario, PLAYER2_ADDRESS);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = test_scenario::take_shared(&mut scenario);
        
        let mut choice_hash2 = vector::empty();
        vector::push_back(&mut choice_hash2, 1); // BETRAY
        
        game_manager::commit_choice(&mut match_obj, choice_hash2, ctx);
        
        assert!(!vector::is_empty(&match_obj.player1_choice_hash), 5);
        assert!(!vector::is_empty(&match_obj.player2_choice_hash), 6);
        
        test_scenario::return_shared(match_obj);
    };
    
    scenario.end();
}

// ============ Choice Reveal Tests ============

#[test]
fun test_reveal_choice_cooperate() {
    let mut scenario = test_scenario::begin(PLAYER1_ADDRESS);
    
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut registry = GameRegistry {
            id: object::new(ctx),
            total_matches: 0,
            total_tournaments: 0,
            total_players: 0,
            admin: PLAYER1_ADDRESS,
        };
        
        game_manager::create_match(&mut registry, PLAYER1_ADDRESS, PLAYER2_ADDRESS, TEST_STAKE, ctx);
    };
    
    test_scenario::next_tx(&mut scenario, PLAYER1_ADDRESS);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = test_scenario::take_shared(&mut scenario);
        
        let mut choice_hash = vector::empty();
        vector::push_back(&mut choice_hash, 0); // COOPERATE
        
        game_manager::commit_choice(&mut match_obj, choice_hash, ctx);
        test_scenario::return_shared(match_obj);
    };
    
    test_scenario::next_tx(&mut scenario, PLAYER1_ADDRESS);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = test_scenario::take_shared(&mut scenario);
        
        let salt = vector::empty();
        game_manager::reveal_choice(&mut match_obj, 0, salt, ctx);
        
        assert!(match_obj.player1_choice == 0, 7); // COOPERATE
        
        test_scenario::return_shared(match_obj);
    };
    
    scenario.end();
}

// ============ Match Resolution Tests ============

#[test]
fun test_match_resolution_cooperate_cooperate() {
    let mut scenario = test_scenario::begin(PLAYER1_ADDRESS);
    
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut registry = GameRegistry {
            id: object::new(ctx),
            total_matches: 0,
            total_tournaments: 0,
            total_players: 0,
            admin: PLAYER1_ADDRESS,
        };
        
        game_manager::create_match(&mut registry, PLAYER1_ADDRESS, PLAYER2_ADDRESS, TEST_STAKE, ctx);
    };
    
    // Player 1 commits and reveals COOPERATE
    test_scenario::next_tx(&mut scenario, PLAYER1_ADDRESS);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = test_scenario::take_shared(&mut scenario);
        
        let mut choice_hash = vector::empty();
        vector::push_back(&mut choice_hash, 0); // COOPERATE
        
        game_manager::commit_choice(&mut match_obj, choice_hash, ctx);
        test_scenario::return_shared(match_obj);
    };
    
    // Player 2 commits COOPERATE
    test_scenario::next_tx(&mut scenario, PLAYER2_ADDRESS);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = test_scenario::take_shared(&mut scenario);
        
        let mut choice_hash = vector::empty();
        vector::push_back(&mut choice_hash, 0); // COOPERATE
        
        game_manager::commit_choice(&mut match_obj, choice_hash, ctx);
        test_scenario::return_shared(match_obj);
    };
    
    // Player 1 reveals
    test_scenario::next_tx(&mut scenario, PLAYER1_ADDRESS);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = test_scenario::take_shared(&mut scenario);
        
        let salt = vector::empty();
        game_manager::reveal_choice(&mut match_obj, 0, salt, ctx);
        
        test_scenario::return_shared(match_obj);
    };
    
    // Player 2 reveals (should trigger resolution)
    test_scenario::next_tx(&mut scenario, PLAYER2_ADDRESS);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = test_scenario::take_shared(&mut scenario);
        
        let salt = vector::empty();
        game_manager::reveal_choice(&mut match_obj, 0, salt, ctx);
        
        assert!(match_obj.resolved, 8);
        assert!(match_obj.player1_reward == 50, 9); // COOPERATE_COOPERATE_REWARD
        assert!(match_obj.player2_reward == 50, 10);
        
        test_scenario::return_shared(match_obj);
    };
    
    scenario.end();
}

#[test]
fun test_match_resolution_cooperate_betray() {
    let mut scenario = test_scenario::begin(PLAYER1_ADDRESS);
    
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut registry = GameRegistry {
            id: object::new(ctx),
            total_matches: 0,
            total_tournaments: 0,
            total_players: 0,
            admin: PLAYER1_ADDRESS,
        };
        
        game_manager::create_match(&mut registry, PLAYER1_ADDRESS, PLAYER2_ADDRESS, TEST_STAKE, ctx);
    };
    
    // Player 1 commits COOPERATE
    test_scenario::next_tx(&mut scenario, PLAYER1_ADDRESS);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = test_scenario::take_shared(&mut scenario);
        
        let mut choice_hash = vector::empty();
        vector::push_back(&mut choice_hash, 0); // COOPERATE
        
        game_manager::commit_choice(&mut match_obj, choice_hash, ctx);
        test_scenario::return_shared(match_obj);
    };
    
    // Player 2 commits BETRAY
    test_scenario::next_tx(&mut scenario, PLAYER2_ADDRESS);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = test_scenario::take_shared(&mut scenario);
        
        let mut choice_hash = vector::empty();
        vector::push_back(&mut choice_hash, 1); // BETRAY
        
        game_manager::commit_choice(&mut match_obj, choice_hash, ctx);
        test_scenario::return_shared(match_obj);
    };
    
    // Both reveal
    test_scenario::next_tx(&mut scenario, PLAYER1_ADDRESS);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = test_scenario::take_shared(&mut scenario);
        let salt = vector::empty();
        game_manager::reveal_choice(&mut match_obj, 0, salt, ctx);
        test_scenario::return_shared(match_obj);
    };
    
    test_scenario::next_tx(&mut scenario, PLAYER2_ADDRESS);
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut match_obj = test_scenario::take_shared(&mut scenario);
        let salt = vector::empty();
        game_manager::reveal_choice(&mut match_obj, 1, salt, ctx);
        
        assert!(match_obj.resolved, 11);
        assert!(match_obj.player1_reward == 0, 12); // COOPERATE vs BETRAY
        assert!(match_obj.player2_reward == 100, 13); // BETRAY vs COOPERATE
        
        test_scenario::return_shared(match_obj);
    };
    
    scenario.end();
}

#[test]
fun test_player_reputation() {
    let mut scenario = test_scenario::begin(PLAYER1_ADDRESS);
    
    {
        let ctx = test_scenario::ctx(&mut scenario);
        let mut registry = GameRegistry {
            id: object::new(ctx),
            total_matches: 0,
            total_tournaments: 0,
            total_players: 0,
            admin: PLAYER1_ADDRESS,
        };
        
        game_manager::register_player(&mut registry, ctx);
    };
    
    test_scenario::next_tx(&mut scenario, PLAYER1_ADDRESS);
    {
        let player = test_scenario::take_from_sender<Player>(&mut scenario);
        
        assert!(game_manager::get_player_reputation(&player) == 1000, 14);
        assert!(game_manager::is_player_active(&player), 15);
        
        test_scenario::return_to_sender(&mut scenario, player);
    };
    
    scenario.end();
}
