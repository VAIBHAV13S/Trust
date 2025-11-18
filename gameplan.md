

# 1. Overall Player Journey (REVISED)

* **[1] Land on app → Connect wallet → Login (on-chain identity)**
* **[2] See lobby & profile (read-only: analytics & past matches)**
* **[3] Press START → enter matchmaking queue (on-chain; stake required)**
* **[4] Match forms (50 players total: humans + bots automatically filled)**
* **[5] Play tournament rounds (all actions on-chain: stake/commit/reveal/settle)**
* **[6] View results, reputation, history (derived from on-chain events & off-chain analytics)**

Notes:

* **No off-chain gameplay fallback** — if a player does not have gas or refuses to transact they cannot play.
* Backend is **non-authoritative** for game outcomes — it provides analytics, usernames, bot agent, and optional auto-relay for bots only.

---

# 2. Session & Wallet Flow (REVISED)

* **Connect Wallet**

  * UI: “Connect OneChain Wallet” button.
  * On click:

    * Detect wallet, connect, get address & public key.
    * Optionally post a signed message to `/auth/login` for JWT (backend for UX/leaderboards only).
    * Load on-chain profile data (reputation token or Reputation.sol if used).
* **Gas & Staking checks (MANDATORY)**

  * Immediately after connect:

    * Fetch OCT balance via `oneChainClient.getBalance`.
    * Fetch token balance for required `STAKE_AMOUNT`.
  * Requirements to press **START**:

    * `balance >= MIN_GAS_THRESHOLD` AND `tokenBalance >= STAKE_AMOUNT`.
  * If either fails:

    * Block START button and show clear CTA:

      * “You need X OCT for gas and Y token for the stake. Please fund your wallet to play.”
* **Security**

  * Always prompt standard wallet confirmations for each on-chain action (enterQueue, stake/commit/reveal, withdraw).

---

# 3. Lobby & Tournament Flow (PUBG-STYLE START BUTTON)

* **Lobby screen**

  * Show:

    * START button (primary CTA)
    * Player reputation, past on-chain match summary, balance info
    * Optional: top leaderboards (derived from events)
* **Press START (MVP only — no create room)**

  * Frontend calls on-chain:

    ```
    matchmaking.enterQueue(stakeAmount)
    ```

    * This call **escrows stake** in contract for that player.
  * UI transitions to “Matching players… (n/50)”.
* **Queue, Fill & Tournament Creation**

  * Queue target: **50 players**.
  * Queue fill behavior:

    * Real players join via `enterQueue`.
    * If queue length < 50 after `QUEUE_FILL_TIMEOUT` (e.g., 10s), contract **auto-fills remaining slots with bots**.

      * Bots are represented on-chain by a `isBot` flag and pseudo-addresses, or real bot wallets controlled by backend (implementation choice — see Contracts section).
    * When `queue.length == 50`, contract auto-calls `createTournament(players[])` and emits `TournamentCreated(tid, players[])`.
* **Frontend event handling**

  * Listen for `TournamentCreated` and `MatchCreated` events.
  * If current user is in the players array, navigate to `/tournament/:tid` and show tournament UI.
  * Show real-time count: “Matching players… (7/50). Filling empty slots with bots in Xs.”

---

# 4. Single Match Flow (HAPPY PATH — Fully On-chain & Mandatory Staking)

* **Step 1: Load match from chain**

  * Fetch match data from `Tournament`/`Match` contract: players, stake, state, deadlines.
  * Display opponent info: address, on-chain username lookup (if available), stake amount, timer.
* **Step 2: Stakes**

  * Stakes are **escrowed on `enterQueue`**; verify `hasStaked` on-chain for both players.
  * If any player’s stake was not escrowed (implementation variant), require `stakeTokens(matchId, amount)` as a mandatory on-chain tx before the commit phase begins.
  * **UI gate**: if `hasStaked == false` for current player, disable Commit/Reveal until stake tx is mined.
* **Step 3: Commit (mandatory)**

  * Client generates `(choice, salt)` and computes `choiceHash = keccak256(choice, salt)`.
  * Call on-chain:

    ```
    matchContract.commitChoice(matchId, choiceHash)
    ```
  * Contract records commit and emits `PlayerCommitted`.
  * UI: show “Committed” and lock the choice UI for the commit phase.
* **Step 4: Reveal (mandatory)**

  * When in reveal phase or both committed:

    ```
    matchContract.revealChoice(matchId, choice, salt)
    ```
  * Contract verifies `keccak256(choice, salt) == commitHash`.
  * Emit `PlayerRevealed`.
* **Step 5: Settlement & Withdraw**

  * When both reveals occur (or deadlines expire), contract computes payoffs and updates internal balances.
  * Players call:

    ```
    matchContract.withdrawWinnings(matchId)
    ```

    or contract auto-transfers depending on design.
  * Emit `MatchSettled` and `WinningsWithdrawn`.
* **Step 6: UI updates**

  * Play result animation, show tokens won/lost, reputation delta, link to explorer for match txs.
  * If player advances, frontend waits for next `MatchCreated` event for next round.

Important:

* **No off-chain commit/reveal** — every commit/reveal must be on-chain. Backend can mirror commits for analytics but not authoritative.

---

# 5. Bots: filling and operation (MVP rules)

* **Bot fill logic**

  * If queue not full after `QUEUE_FILL_TIMEOUT`, contract adds bot slots until 50.
  * Option A (recommended MVP): **contract stores `isBot` flag** and a pseudo-bot id/address. The backend bot agent then acts on behalf of those slots using a set of pre-funded bot wallets to submit on-chain commits/reveals.
  * Option B: mapping each bot to a distinct pre-funded bot wallet recorded on-chain (more transparent but requires more wallets).
* **Bot actions**

  * Bot agent listens for `TournamentCreated` & `MatchCreated`, and:

    * Stakes (if required), commits and reveals using bot wallets.
    * Uses simple probabilistic AI (e.g., 70% cooperate vs humans, random vs bots).
* **On-chain visibility**

  * All bot transactions are on-chain (authored by bot wallet addresses) so gameplay traces are auditable.
* **Failure handling**

  * If a bot wallet transaction reverts or is delayed, the contract’s deadline logic resolves the match (forfeit/ABSTAIN) — no human rescue required.

---

# 6. On-chain contract responsibilities (summary)

* `Matchmaking.enterQueue(stakeAmount)` — escrow stake and append player.
* `Matchmaking.autoFillBots()` — after timeout, fill to 50 and call `createTournament`.
* `Tournament.createTournament(players[])` — create tournament record and generate first round matches.
* `Match.createMatch(p1,p2,stake,deadlines)` — handle commit/reveal, compute settlement.
* `Match.commitChoice`, `Match.revealChoice`, `Match.withdrawWinnings` — all required on-chain.
* Events to emit: `PlayerEnteredQueue`, `TournamentCreated`, `MatchCreated`, `PlayerCommitted`, `PlayerRevealed`, `MatchSettled`, `WinningsWithdrawn`.

Security & gas:

* Use deadlines + grace windows.
* Use safe math, reentrancy guards, and gas-efficient storage.
* Minimize per-match storage; store minimal mapping and emit events for indexing.

---

# 7. Timeouts, Disconnects & Edge Cases (REVISED for fully on-chain)

* **Commit deadline expires**

  * If player A fails to commit:

    * Treat as forfeit or ABSTAIN based on chosen rule.
    * Opponent can claim the stake after `commitDeadline + grace`.
* **Reveal deadline expires**

  * If a committed player fails to reveal:

    * Treat reveal failure as ABSTAIN or default loss (choose deterministic rule); contract resolves and settles.
* **Wallet rejected tx**

  * If wallet rejects a tx, player cannot proceed; UI should show precise error and indicate they’ve forfeited if deadlines pass.
* **Bot tx failure**

  * Bot agent retries within a backoff window; if bot still misses deadlines, contract deadlines resolve the match automatically.
* **Emergency withdraw**

  * Provide `emergencyWithdraw` only for funds escrowed but linked to matches long abandoned (gas and UX tradeoff). This should be a carefully gated function to avoid griefing.

---

# 8. Post-game & History (REVISED)

* **On-chain first, off-chain indexing second**

  * Store authoritative results on-chain.
  * Index events in backend to build user-facing history, leaderboards, and reputation.
* **History page**

  * For each entry show:

    * TournamentId, MatchId
    * Opponent (on-chain address + username if registered)
    * Result (Win/Loss/Draw)
    * Stake in/out (tokens)
    * Link(s) to explorer for relevant tx hashes (enterQueue, commit, reveal, withdraw)
    * `isBot` marker if opponent was a bot
* **Reputation**

  * Optionally on-chain Reputation.sol, updated per `MatchSettled` events and read by frontend.

---

# 9. Frontend: UX rules & gating (REVISED)

* **START CTA**

  * Disabled unless wallet connected and both gas + stake funds are present.
  * On press: show wallet tx modal for `enterQueue(stakeAmount)`.
* **Matching UI**

  * Live numeric progress: “Matching players… (n/50)”
  * Clear message that bots will be filled after Xs.
* **Match UI**

  * If `hasStaked == false` for current player: show large “Stake tokens” CTA; block Commit.
  * Commit button triggers wallet tx; disable until commit tx mined.
  * Reveal button active only during reveal phase and after commit.
* **Errors**

  * Show clear wallet error messages and the on-chain deadline consequences (e.g., “If you miss the reveal deadline you will forfeit the stake”).
* **Bot indicator**

  * Clearly label bot opponents (e.g., “Bot #22”) so users know they’re playing bots.

---

# 10. Minimal backend responsibilities (REVISED)

* Provide non-authoritative features only:

  * Username mapping (address → display name)
  * Indexed history & leaderboards from chain events
  * Bot agent to operate bot wallets (stake/commit/reveal)
  * Analytics, monitoring, and alerting
* **Do not** perform match settlement, commit/reveal verification, or any authoritative game logic.



