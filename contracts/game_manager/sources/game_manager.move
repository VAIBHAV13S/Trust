/// Trust Game Manager - Prisoner's Dilemma variant for OneChain
module game_manager::game_manager {
    use one::bcs;
    use one::hash;
    use one::object::{UID, new};
    use one::transfer;
    use one::tx_context::{TxContext, sender};
    use one::event;
    use std::vector;

    // ============ Constants ============
    const INITIAL_REPUTATION: u64 = 1000;
    const CHOICE_COOPERATE: u8 = 0;
    const CHOICE_BETRAY: u8 = 1;
    const CHOICE_ABSTAIN: u8 = 2;
    const MATCH_STATUS_PENDING: u8 = 0;
    const MATCH_STATUS_RESOLVED: u8 = 1;
    const GAME_ADMIN: address = @0xc15be5957a329fcd522024909f70b9f86bd76c2dbf630353db3c098bb2ccdb54;

    // Payoff rewards
    const COOPERATE_COOPERATE_REWARD: u64 = 50;
    const COOPERATE_BETRAY_REWARD: u64 = 0;
    const BETRAY_COOPERATE_REWARD: u64 = 100;
    const BETRAY_BETRAY_REWARD: u64 = 0;
    const ABSTAIN_REWARD: u64 = 25;

    // Error codes
    const ERR_NOT_PARTICIPANT: u64 = 7;
    const ERR_CHOICE_ALREADY_COMMITTED: u64 = 8;
    const ERR_INVALID_CHOICE: u64 = 10;
    const ERR_ALREADY_REVEALED: u64 = 11;
    const ERR_INVALID_REVEAL: u64 = 12;
    const ERR_NOT_RESOLVED: u64 = 13;
    const ERR_ALREADY_PAID: u64 = 14;
    const ERR_NOT_STAKE_PARTICIPANT: u64 = 15;
    const ERR_EMERGENCY_NOT_AVAILABLE: u64 = 16;
    const ERR_COMMIT_REQUIRED: u64 = 17;
    const ERR_NOT_AUTHORIZED: u64 = 18;
    const ERR_GAME_STATE_ALREADY_INIT: u64 = 19;

    // ============ Structs ============

    public struct Player has key, store {
        id: UID,
        owner: address,
        reputation: u64,
        matches_played: u64,
        wins: u64,
    }

    public struct Match has key, store {
        id: UID,
        player1: address,
        player2: address,
        player1_choice_hash: vector<u8>,
        player2_choice_hash: vector<u8>,
        player1_choice: u8,
        player2_choice: u8,
        player1_revealed: bool,
        player2_revealed: bool,
        player1_reward: u64,
        player2_reward: u64,
        player1_rep_delta: u64,
        player2_rep_delta: u64,
        player1_rep_positive: bool,
        player2_rep_positive: bool,
        player1_stake: u64,
        player2_stake: u64,
        stake: u64,
        status: u8,
        resolved: bool,
        player1_paid_out: bool,
        player2_paid_out: bool,
    }

    public struct GameState has key {
        id: UID,
        total_matches: u64,
        total_players: u64,
    }

    public struct GameStateCap has key {
        id: UID,
    }

    // ============ Events ============

    public struct PlayerRegisteredEvent has copy, drop {
        player: address,
        reputation: u64,
    }

    public struct ChoiceCommittedEvent has copy, drop {
        player: address,
    }

    public struct ChoiceRevealedEvent has copy, drop {
        player: address,
        choice: u8,
    }

    public struct MatchResolvedEvent has copy, drop {
        player1: address,
        player2: address,
        player1_choice: u8,
        player2_choice: u8,
        player1_reward: u64,
        player2_reward: u64,
    }

    // ============ Functions ============

    public entry fun register_player(game_state: &mut GameState, ctx: &mut TxContext) {
        let player_addr = sender(ctx);
        event::emit(PlayerRegisteredEvent {
            player: player_addr,
            reputation: INITIAL_REPUTATION,
        });
        
        transfer::transfer(
            Player {
                id: new(ctx),
                owner: player_addr,
                reputation: INITIAL_REPUTATION,
                matches_played: 0,
                wins: 0,
            },
            player_addr,
        );
        game_state.total_players = game_state.total_players + 1;
    }

    public entry fun create_match(
        game_state: &mut GameState,
        _opponent: address,
        _stake: u64,
        ctx: &mut TxContext
    ) {
        let player_addr = sender(ctx);
        let match_obj = Match {
            id: new(ctx),
            player1: player_addr,
            player2: _opponent,
            player1_choice_hash: vector::empty(),
            player2_choice_hash: vector::empty(),
            player1_choice: CHOICE_ABSTAIN,
            player2_choice: CHOICE_ABSTAIN,
            player1_revealed: false,
            player2_revealed: false,
            player1_reward: 0,
            player2_reward: 0,
            player1_rep_delta: 0,
            player2_rep_delta: 0,
            player1_rep_positive: true,
            player2_rep_positive: true,
            player1_stake: 0,
            player2_stake: 0,
            stake: _stake,
            status: MATCH_STATUS_PENDING,
            resolved: false,
            player1_paid_out: false,
            player2_paid_out: false,
        };
        
        transfer::share_object(match_obj);
        game_state.total_matches = game_state.total_matches + 1;
    }

    public entry fun init_game_state(ctx: &mut TxContext) {
        let caller = sender(ctx);
        assert!(caller == GAME_ADMIN, ERR_NOT_AUTHORIZED);

        let cap = GameStateCap { id: new(ctx) };
        let game_state = GameState {
            id: new(ctx),
            total_matches: 0,
            total_players: 0,
        };

        transfer::share_object(game_state);
        transfer::transfer(cap, GAME_ADMIN);
    }

    public entry fun stake_tokens(
        match_obj: &mut Match,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let player_addr = sender(ctx);
        assert!(amount > 0, ERR_INVALID_CHOICE);
        assert!(match_obj.player1 == player_addr || match_obj.player2 == player_addr, ERR_NOT_STAKE_PARTICIPANT);
        assert!(!match_obj.resolved, ERR_NOT_RESOLVED);

        if (match_obj.player1 == player_addr) {
            match_obj.player1_stake = match_obj.player1_stake + amount;
        } else {
            match_obj.player2_stake = match_obj.player2_stake + amount;
        };
        match_obj.stake = match_obj.stake + amount;
    }

    public entry fun commit_choice(
        match_obj: &mut Match,
        choice_hash: vector<u8>,
        ctx: &mut TxContext
    ) {
        let player_addr = sender(ctx);
        assert!(match_obj.player1 == player_addr || match_obj.player2 == player_addr, ERR_NOT_PARTICIPANT);
        
        if (match_obj.player1 == player_addr) {
            assert!(vector::length(&match_obj.player1_choice_hash) == 0, ERR_CHOICE_ALREADY_COMMITTED);
            match_obj.player1_choice_hash = choice_hash;
        } else {
            assert!(vector::length(&match_obj.player2_choice_hash) == 0, ERR_CHOICE_ALREADY_COMMITTED);
            match_obj.player2_choice_hash = choice_hash;
        };
        
        event::emit(ChoiceCommittedEvent {
            player: player_addr,
        });
    }

    public entry fun reveal_choice(
        match_obj: &mut Match,
        choice: u8,
        salt: vector<u8>,
        ctx: &mut TxContext
    ) {
        let player_addr = sender(ctx);
        assert!(match_obj.player1 == player_addr || match_obj.player2 == player_addr, ERR_NOT_PARTICIPANT);
        assert!(choice <= 2, ERR_INVALID_CHOICE);
        
        if (match_obj.player1 == player_addr) {
            assert!(vector::length(&match_obj.player1_choice_hash) > 0, ERR_COMMIT_REQUIRED);
            assert!(!match_obj.player1_revealed, ERR_ALREADY_REVEALED);
            let expected = calculate_choice_commitment(choice, &salt);
            assert!(expected == match_obj.player1_choice_hash, ERR_INVALID_REVEAL);
            match_obj.player1_choice = choice;
            match_obj.player1_revealed = true;
        } else {
            assert!(vector::length(&match_obj.player2_choice_hash) > 0, ERR_COMMIT_REQUIRED);
            assert!(!match_obj.player2_revealed, ERR_ALREADY_REVEALED);
            let expected = calculate_choice_commitment(choice, &salt);
            assert!(expected == match_obj.player2_choice_hash, ERR_INVALID_REVEAL);
            match_obj.player2_choice = choice;
            match_obj.player2_revealed = true;
        };
        
        event::emit(ChoiceRevealedEvent {
            player: player_addr,
            choice,
        });

        try_resolve(match_obj);
    }

    public entry fun claim_winnings(match_obj: &mut Match, player: &mut Player) {
        assert!(match_obj.resolved, ERR_NOT_RESOLVED);
        let player_addr = player.owner;
        let is_player1 = match_obj.player1 == player_addr;
        let is_player2 = match_obj.player2 == player_addr;
        assert!(is_player1 || is_player2, ERR_NOT_PARTICIPANT);

        if (is_player1) {
            assert!(!match_obj.player1_paid_out, ERR_ALREADY_PAID);
            distribute_reward(player, match_obj.player1_reward, match_obj.player2_reward, match_obj.player1_rep_delta, match_obj.player1_rep_positive);
            match_obj.player1_paid_out = true;
        } else {
            assert!(!match_obj.player2_paid_out, ERR_ALREADY_PAID);
            distribute_reward(player, match_obj.player2_reward, match_obj.player1_reward, match_obj.player2_rep_delta, match_obj.player2_rep_positive);
            match_obj.player2_paid_out = true;
        };
    }

    public entry fun emergency_withdraw(
        match_obj: &mut Match,
        caller: &mut Player,
        _ctx: &mut TxContext
    ) {
        let caller_addr = caller.owner;
        assert!(match_obj.player1 == caller_addr || match_obj.player2 == caller_addr, ERR_NOT_PARTICIPANT);
        assert!(!match_obj.resolved, ERR_NOT_RESOLVED);

        // Allow withdrawal only if opponent has not committed
        if (match_obj.player1 == caller_addr) {
            assert!(vector::length(&match_obj.player2_choice_hash) == 0, ERR_EMERGENCY_NOT_AVAILABLE);
            match_obj.player1_reward = match_obj.player1_stake;
            match_obj.player2_reward = 0;
            match_obj.player1_rep_delta = 0;
            match_obj.player2_rep_delta = 0;
            match_obj.player1_rep_positive = true;
            match_obj.player2_rep_positive = true;
        } else {
            assert!(vector::length(&match_obj.player1_choice_hash) == 0, ERR_EMERGENCY_NOT_AVAILABLE);
            match_obj.player2_reward = match_obj.player2_stake;
            match_obj.player1_reward = 0;
            match_obj.player1_rep_delta = 0;
            match_obj.player2_rep_delta = 0;
            match_obj.player1_rep_positive = true;
            match_obj.player2_rep_positive = true;
        };

        match_obj.status = MATCH_STATUS_RESOLVED;
        match_obj.resolved = true;

        event::emit(MatchResolvedEvent {
            player1: match_obj.player1,
            player2: match_obj.player2,
            player1_choice: match_obj.player1_choice,
            player2_choice: match_obj.player2_choice,
            player1_reward: match_obj.player1_reward,
            player2_reward: match_obj.player2_reward,
        });
    }

    // ============ Helper Functions ============

    public fun calculate_choice_commitment(choice: u8, salt: &vector<u8>): vector<u8> {
        let mut payload = bcs::to_bytes(&choice);
        let mut i = 0;
        let len = vector::length(salt);
        while (i < len) {
            let byte_ref = vector::borrow(salt, i);
            vector::push_back(&mut payload, *byte_ref);
            i = i + 1;
        };
        hash::blake2b256(&payload)
    }

    fun try_resolve(match_obj: &mut Match) {
        if (!match_obj.player1_revealed || !match_obj.player2_revealed) {
            return
        };

        resolve_match(match_obj);
    }

    fun resolve_match(match_obj: &mut Match) {
        let c1 = match_obj.player1_choice;
        let c2 = match_obj.player2_choice;
        let (p1_tokens, p2_tokens, p1_rep_delta, p1_rep_positive, p2_rep_delta, p2_rep_positive) = outcome_for(c1, c2);

        match_obj.player1_reward = match_obj.player1_stake + p1_tokens;
        match_obj.player2_reward = match_obj.player2_stake + p2_tokens;
        match_obj.player1_rep_delta = p1_rep_delta;
        match_obj.player2_rep_delta = p2_rep_delta;
        match_obj.player1_rep_positive = p1_rep_positive;
        match_obj.player2_rep_positive = p2_rep_positive;
        match_obj.status = MATCH_STATUS_RESOLVED;
        match_obj.resolved = true;
        
        event::emit(MatchResolvedEvent {
            player1: match_obj.player1,
            player2: match_obj.player2,
            player1_choice: c1,
            player2_choice: c2,
            player1_reward: match_obj.player1_reward,
            player2_reward: match_obj.player2_reward,
        });
    }

    fun outcome_for(c1: u8, c2: u8): (u64, u64, u64, bool, u64, bool) {
        if (c1 == CHOICE_COOPERATE && c2 == CHOICE_COOPERATE) {
            (COOPERATE_COOPERATE_REWARD, COOPERATE_COOPERATE_REWARD, 10, true, 10, true)
        } else if (c1 == CHOICE_COOPERATE && c2 == CHOICE_BETRAY) {
            (COOPERATE_BETRAY_REWARD, BETRAY_COOPERATE_REWARD, 20, false, 5, true)
        } else if (c1 == CHOICE_BETRAY && c2 == CHOICE_COOPERATE) {
            (BETRAY_COOPERATE_REWARD, COOPERATE_BETRAY_REWARD, 5, true, 20, false)
        } else if (c1 == CHOICE_BETRAY && c2 == CHOICE_BETRAY) {
            (BETRAY_BETRAY_REWARD, BETRAY_BETRAY_REWARD, 10, false, 10, false)
        } else {
            (ABSTAIN_REWARD, ABSTAIN_REWARD, 0, true, 0, true)
        }
    }

    fun distribute_reward(
        player: &mut Player,
        reward: u64,
        opponent_reward: u64,
        rep_delta: u64,
        rep_positive: bool
    ) {
        player.matches_played = player.matches_played + 1;
        if (reward > opponent_reward) {
            player.wins = player.wins + 1;
        };

        if (rep_delta > 0) {
            apply_reputation_delta(player, rep_delta, rep_positive);
        };
    }

    fun apply_reputation_delta(player: &mut Player, delta: u64, increase: bool) {
        if (increase) {
            player.reputation = player.reputation + delta;
        } else {
            if (player.reputation > delta) {
                player.reputation = player.reputation - delta;
            } else {
                player.reputation = 0;
            };
        }
    }
}
