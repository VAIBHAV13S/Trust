module game_manager::matchmaking {
    use one::object::{UID, new};
    use one::tx_context::{TxContext, sender};
    use one::transfer;
    use one::event;
    use std::vector;
    use game_manager::tournament;

    public struct Queue has key {
        id: UID,
        players: vector<address>,
        target_size: u64,
        stake_amount: u64,
    }

    public struct PlayerEnteredQueue has copy, drop {
        player: address,
        stake_amount: u64,
    }

    public struct QueueFilled has copy, drop {
        players: vector<address>,
        total_bots: u64,
    }

    public entry fun init_queue(
        target_size: u64,
        stake_amount: u64,
        ctx: &mut TxContext,
    ) {
        let queue = Queue {
            id: new(ctx),
            players: vector::empty<address>(),
            target_size,
            stake_amount,
        };
        transfer::share_object(queue);
    }

    public entry fun enter_queue(
        queue: &mut Queue,
        ctx: &mut TxContext,
    ) {
        let player = sender(ctx);
        vector::push_back(&mut queue.players, player);
        event::emit(PlayerEnteredQueue {
            player,
            stake_amount: queue.stake_amount,
        });
    }

    public entry fun auto_fill_bots(
        queue: &mut Queue,
        ctx: &mut TxContext,
    ) {
        let current = vector::length(&queue.players);
        let total_bots = if (current >= queue.target_size) {
            0
        } else {
            queue.target_size - current
        };

        let players = copy queue.players;

        event::emit(QueueFilled {
            players: copy players,
            total_bots,
        });

        tournament::create_tournament(players, total_bots, ctx);
    }
}
