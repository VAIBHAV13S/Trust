module game_manager::tournament {
    use one::object;
    use one::object::{UID, ID, new};  // add ID here
    use one::tx_context::TxContext;
    use one::transfer;
    use one::event;
    use std::vector;

    public struct Tournament has key {
        id: UID,
        players: vector<address>,
        total_bots: u64,
        current_round: u64,
    }

    public struct TournamentCreated has copy, drop {
        tournament_id: ID,        // was address
        players: vector<address>,
        total_bots: u64,
    }

    public struct MatchCreated has copy, drop {
        tournament_id: ID,        // was address
        round: u64,
        match_index: u64,
        player1: address,
        player2: address,
    }

    public fun create_tournament(
        players: vector<address>,
        total_bots: u64,
        ctx: &mut TxContext,
    ) {
        let mut tournament = Tournament {
            id: new(ctx),
            players,
            total_bots,
            current_round: 1,
        };

        let tid = object::id(&tournament);

        event::emit(TournamentCreated {
            tournament_id: tid,
            players: copy tournament.players,
            total_bots,
        });

        create_round_matches(&mut tournament, ctx);

        transfer::share_object(tournament);
    }

    public fun create_round_matches(
        tournament: &mut Tournament,
        _ctx: &mut TxContext,
    ) {
        let tid = object::id(tournament);
        let round = tournament.current_round;
        let len = vector::length(&tournament.players);
        let mut i = 0;
        let mut match_index: u64 = 0;

        while (i + 1 < len) {
            let p1_ref = vector::borrow(&tournament.players, i);
            let p2_ref = vector::borrow(&tournament.players, i + 1);
            let p1 = *p1_ref;
            let p2 = *p2_ref;

            event::emit(MatchCreated {
                tournament_id: tid,
                round,
                match_index,
                player1: p1,
                player2: p2,
            });

            match_index = match_index + 1;
            i = i + 2;
        };
    }

    public entry fun create_round_matches_entry(
        tournament: &mut Tournament,
        ctx: &mut TxContext,
    ) {
        create_round_matches(tournament, ctx);
    }
}
