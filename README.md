# Trust: Blockchain Battle Royale Trust Game

A 50-player blockchain-based battle royale trust game where players make strategic decisions (Cooperate, Betray, Abstain) in 1v1 matches on the OneChain network.

## ⚠️ CRITICAL: Move Language Requirement

**OneChain does NOT support Solidity.** The current GameManager.sol contract must be rewritten in Move.

**See `ONECHAIN_MOVE_REQUIREMENT.md` for:**
- Why Move is required (not optional)
- Solidity vs Move comparison
- Step-by-step rewrite roadmap
- Timeline and implementation plan

**Current Status**: Solidity contract ready for review, but cannot deploy to OneChain without Move rewrite.

- **50 players** enter an elimination tournament
- Players face off in **1v1 matches** playing a Prisoner's Dilemma variant
- Winners advance through rounds until one champion remains
- **Smart contract escrow** manages token staking and rewards
- **On-chain reputation system** tracks player behavior
- **Real-time multiplayer** matchmaking with AI bots to fill empty slots

## 🛠️ Tech Stack

### Frontend
- React.js with TypeScript
- Redux Toolkit for state management
- Tailwind CSS for styling
- OneWallet SDK for blockchain authentication
- ethers.js for Web3 interactions
- Socket.io-client for real-time updates

### Backend
- Node.js with Express.js
- Socket.io for WebSocket communication
- MongoDB for player profiles and match history
- Bull queue for matchmaking management
- JWT authentication

### Blockchain
- **IMPORTANT**: OneChain uses Move, not Solidity
- Smart contracts require Move language (under rewrite)
- OneChain testnet/mainnet deployment
- See `ONECHAIN_MOVE_REQUIREMENT.md` for critical information

## 📁 Project Structure

```
Trust/
├── frontend/          # React.js web application
├── backend/           # Node.js Express server
├── contracts/         # Solidity smart contracts
├── docs/              # Documentation
└── .github/           # GitHub configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git
- OneWallet extension (for browser)

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Smart Contracts Setup
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
```

## 📋 Features

- ✅ OneWallet authentication
- ✅ Token staking with smart contract escrow
- ✅ Real-time multiplayer matchmaking
- ✅ AI bots with multiple strategies
- ✅ On-chain reputation system
- ✅ Battle royale elimination rounds
- ✅ Cumulative scoring with round multipliers
- ✅ Global leaderboard
- ✅ Full match history with blockchain verification

## 📅 Development Timeline

- **Day 1**: Project foundation and setup
- **Day 2**: Authentication and smart contract foundation
- **Day 3**: Waiting room and matchmaking
- **Day 4**: Core gameplay interface
- **Day 5**: Smart contract game logic
- **Day 6**: Blockchain integration
- **Day 7**: Battle royale progression system
- **Day 8**: UI polish and advanced features
- **Day 9**: Testing and demo preparation
- **Day 10**: Final deployment and submission

## 📚 Documentation

See `/docs` for:
- API endpoint specifications
- Smart contract documentation
- Database schema
- Architecture diagrams
- Game rules and mechanics

## 🔐 Security

- Commit-reveal scheme for hiding player choices
- Reentrancy protection on smart contracts
- Input validation on all endpoints
- Environment variable protection
- Rate limiting on API endpoints

## 📝 License

MIT

## 👥 Team

- Frontend Developer
- Backend Developer
- Smart Contract Developer
