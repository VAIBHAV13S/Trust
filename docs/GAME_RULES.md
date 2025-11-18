# Trust Game - Rules & Mechanics

## Overview
A 50-player blockchain-based battle royale where players compete in 1v1 matches using a Prisoner's Dilemma variant. Winners advance through 6 elimination rounds until a champion is crowned.

## Game Phases

### Phase 1: Tournament Assembly (Day 1)
- 50 players register and stake tokens
- Players join the matchmaking queue
- AI bots fill any empty slots
- Tournament bracket is generated

### Phase 2: Match Execution (Rounds 1-6)
Each round consists of:
1. **Waiting Room** - Players wait for match pairing (5-10 minutes max)
2. **Match Found** - Two players are paired, both see opponent info
3. **Decision Phase** - 30 seconds to make choice (Cooperate, Betray, or Abstain)
4. **Reveal Phase** - Choices are revealed simultaneously
5. **Result Display** - Outcome and rewards shown
6. **Round Cleanup** - Loser is eliminated, winner advances

## Player Actions

### Three Available Choices

#### 1. Cooperate (🤝)
- **Description**: Work together for mutual benefit
- **Risk**: Opponent can betray you
- **Reward if both cooperate**: 50 tokens each, +10 reputation each
- **Reward if only you cooperate**: 0 tokens, -20 reputation

#### 2. Betray (😈)
- **Description**: Act selfishly at opponent's expense
- **Risk**: If both betray, nobody gains
- **Reward if only you betray**: 100 tokens, +5 reputation
- **Reward if both betray**: 0 tokens, -10 reputation each

#### 3. Abstain (🤷)
- **Description**: Refuse to play the round
- **Outcome**: Always results in tie
- **Reward**: 25 tokens each, 0 reputation change
- **Use case**: Tactical timeout or risk avoidance

## Payoff Matrix

| Player 1 | Player 2 | P1 Tokens | P2 Tokens | P1 Rep | P2 Rep |
|----------|----------|-----------|-----------|--------|--------|
| Cooperate | Cooperate | +50 | +50 | +10 | +10 |
| Cooperate | Betray | 0 | +100 | -20 | +5 |
| Betray | Cooperate | +100 | 0 | +5 | -20 |
| Betray | Betray | 0 | 0 | -10 | -10 |
| Abstain | Any | +25 | +25 | 0 | 0 |

## Tournament Structure

### Progression

```
Round 1: 50 players → 25 matches → 25 winners
Round 2: 25 players → 12 matches + 1 bye → 13 winners
Round 3: 13 players → 6 matches + 1 bye → 7 winners
Round 4: 7 players → 3 matches + 1 bye → 4 winners
Round 5: 4 players → 2 matches → 2 winners
Round 6: 2 players → 1 match → 1 champion
```

### Bye Rounds
- When odd number of players remain, one gets a "bye"
- Bye winner automatically advances without playing
- Bye rounds don't affect reputation but advance the player

## Winning Conditions

### Match Winner
- Player with most accumulated tokens wins the match
- If tied on tokens, higher reputation wins
- If tied on both, match is drawn (50/50 chance)

### Tournament Winner
- Last player remaining after all rounds
- Wins prize pool (exact distribution TBD)
- Receives special badge and recognition

## Player Statistics

### Tracked Metrics
- **Total Tokens Earned**: Sum of all match rewards
- **Reputation Score**: Adjusted based on choices and outcomes
- **Match Record**: Wins/losses/draws
- **Cooperation Rate**: % of matches cooperated
- **Betrayal Rate**: % of matches betrayed
- **Abstention Rate**: % of matches abstained

### Reputation System
- **Base**: Start at 1000 reputation
- **Cooperative play**: +10 reputation per mutual cooperation
- **Betrayal**: +5 reputation if you betray (exploiter bonus)
- **Exploitation victim**: -20 reputation if betrayed while cooperating
- **Mutual betrayal**: -10 reputation each
- **Minimum**: Reputation cannot go below 0
- **Leaderboard**: Ranked primarily by reputation, secondary by earnings

## Special Rules

### Timeout Handling
- If player doesn't submit choice within 30 seconds: **Auto-Abstain**
- Opponent still makes their choice
- Results apply normally

### Disconnection Protocol
- 5-second reconnection window
- After 5 seconds without reconnection: **Automatic Forfeit** (loss)
- Forfeit player loses all staked tokens and -50 reputation

### AI Bot Strategy Distribution
- **Cooperators (60%)**: Always cooperate, high reputation focus
- **Betrayers (30%)**: Always betray, maximize token gains
- **Random (10%)**: 50/50 chance each round

## Prize Distribution (Hypothetical)

### Tournament Champions
- **1st Place (Champion)**: 40% of prize pool
- **2nd Place (Runner-up)**: 25% of prize pool
- **3rd Place (Semi-finalist)**: 15% of prize pool
- **Remaining 47 players**: Share 20% based on reputation

### Reputation Bonuses
- Champion: +200 reputation
- Runner-up: +100 reputation
- Semi-finalist: +50 reputation

## Game Theory Insights

### Nash Equilibrium
Mutual defection (betrayal) is the Nash Equilibrium, but:
- Produces worst collective outcome (0 tokens each)
- Mutual cooperation yields 2x the reward per player
- Reputation incentivizes cooperation over time

### Strategy Types
1. **Always Cooperate**: Vulnerable to exploitation, high reputation
2. **Always Betray**: Maximize personal gain, punished with -10 rep
3. **Tit-for-Tat**: Copy opponent's last move, optimal long-term strategy
4. **Random**: Unpredictable, average outcomes
5. **Mixed**: Adapt based on opponent profile and match history

## Match Duration

- **Waiting for opponent**: 10 minutes max (then cancel)
- **Decision window**: 30 seconds
- **Result display**: 10 seconds
- **Between round**: 5 seconds
- **Total per round**: ~2-3 minutes max

## Fairness Mechanisms

1. **Blind Choice**: Commit-reveal prevents information leakage
2. **Simultaneous Reveal**: No advantage for going second
3. **Transparent Outcomes**: All results recorded on-chain
4. **Tamper-Proof**: Smart contracts execute automatically
5. **Verifiable**: Players can audit their match history anytime

## Anti-Cheating Measures

1. **Commit-Reveal Scheme**: Hides player choices until both committed
2. **Timeout Penalties**: Discourages rage-quits
3. **Address Linking**: One wallet per player
4. **Rate Limiting**: Prevents rapid tournament re-entries
5. **Reputation History**: Flagged accounts with suspicious patterns

## Special Cases

### All-Abstain Scenario
- Very rare but possible
- Both get 25 tokens, 0 reputation change
- Match marked as draw
- Opponent randomly selected to advance (50/50)

### Maximum Reputation Scenario
- No upper limit on reputation
- Can accumulate indefinitely
- Acts as primary ranking metric

### Token Balance
- Players can't stake more than they own
- Withdrawn tokens become immediately available
- Rewards are instant (after match resolution)
