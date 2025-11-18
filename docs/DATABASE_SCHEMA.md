# Database Schema

## MongoDB Collections

### Users
```javascript
{
  _id: ObjectId,
  walletAddress: String (unique, indexed),
  username: String (unique, indexed),
  reputation: Number (default: 1000),
  tokensStaked: Number (default: 0),
  tokensAvailable: Number (default: 0),
  totalEarnings: Number (default: 0),
  matchesPlayed: Number (default: 0),
  matchesWon: Number (default: 0),
  cooperationRate: Number (default: 0), // percentage
  betrayalRate: Number (default: 0), // percentage
  lastActiveAt: Date,
  createdAt: Date (indexed),
  updatedAt: Date
}
```

### Matches
```javascript
{
  _id: ObjectId,
  tournamentId: ObjectId (indexed),
  roundNumber: Number (indexed),
  player1: {
    address: String (indexed),
    username: String,
    choice: String (null | "cooperate" | "betray" | "abstain"),
    hashedChoice: String,
    tokensEarned: Number,
    reputationChange: Number
  },
  player2: {
    address: String (indexed),
    username: String,
    choice: String,
    hashedChoice: String,
    tokensEarned: Number,
    reputationChange: Number
  },
  isBot: {
    player1: Boolean,
    player2: Boolean
  },
  status: String ("pending" | "in_progress" | "resolved"),
  stake: Number,
  outcome: String ("player1_win" | "player2_win" | "tie"),
  startTime: Date,
  endTime: Date,
  transactionHash: String,
  createdAt: Date (indexed),
  updatedAt: Date
}
```

### Tournaments
```javascript
{
  _id: ObjectId,
  status: String ("waiting" | "in_progress" | "completed"),
  totalPlayers: Number (max: 50),
  currentRound: Number,
  totalRounds: Number (default: 6),
  players: [String], // wallet addresses
  bracket: {
    roundX: [
      {
        matchId: ObjectId,
        position: Number
      }
    ]
  },
  prizePool: {
    totalTokens: Number,
    distribution: {
      champion: Number,
      runner_up: Number,
      third: Number
    }
  },
  startTime: Date,
  endTime: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Bots
```javascript
{
  _id: ObjectId,
  name: String,
  strategy: String ("cooperator" | "betrayer" | "random" | "tit_for_tat"),
  reputation: Number,
  matchHistory: [ObjectId], // Match IDs
  cooperationRate: Number,
  betrayalRate: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### MatchQueues
```javascript
{
  _id: ObjectId,
  walletAddress: String (indexed),
  stakeAmount: Number,
  joinedAt: Date,
  position: Number,
  status: String ("waiting" | "matched" | "cancelled"),
  createdAt: Date,
  updatedAt: Date
}
```

### Transactions
```javascript
{
  _id: ObjectId,
  type: String ("stake" | "reward" | "penalty"),
  playerAddress: String (indexed),
  matchId: ObjectId,
  amount: Number,
  reputationChange: Number,
  transactionHash: String (indexed),
  status: String ("pending" | "confirmed" | "failed"),
  createdAt: Date,
  updatedAt: Date
}
```

## Indexes

```javascript
// Users
db.users.createIndex({ walletAddress: 1 }, { unique: true })
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ reputation: -1 })
db.users.createIndex({ createdAt: -1 })

// Matches
db.matches.createIndex({ tournamentId: 1 })
db.matches.createIndex({ "player1.address": 1 })
db.matches.createIndex({ "player2.address": 1 })
db.matches.createIndex({ roundNumber: 1 })
db.matches.createIndex({ status: 1 })
db.matches.createIndex({ createdAt: -1 })

// Tournaments
db.tournaments.createIndex({ status: 1 })
db.tournaments.createIndex({ createdAt: -1 })

// MatchQueues
db.matchQueues.createIndex({ walletAddress: 1 })
db.matchQueues.createIndex({ status: 1 })
db.matchQueues.createIndex({ joinedAt: 1 })

// Transactions
db.transactions.createIndex({ playerAddress: 1 })
db.transactions.createIndex({ transactionHash: 1 })
db.transactions.createIndex({ createdAt: -1 })
```

## Relationships

- **User** → **Matches**: One user can have many matches (player1 or player2)
- **Tournament** → **Matches**: One tournament has multiple matches organized in rounds
- **Match** → **Transactions**: One match can have multiple transactions (rewards/penalties)
- **Bot** → **Matches**: Bots can participate in matches same as users

## Data Flow

1. Player joins tournament → creates MatchQueue entry
2. Matchmaking pairs players → creates Match entry
3. Players make choices → Match status updates to "in_progress"
4. Results calculated → Transactions created, User stats updated
5. Round progresses → New matches created for next round
6. Tournament ends → Prize distribution via Transactions
