# Trust Game - Move/OneChain Deployment Guide

## Overview

The Trust Game smart contracts are now written in Move and deploy on OneChain. This guide covers setup, building, testing, and publishing.

## Prerequisites

### 1. Install OneChain CLI

**macOS/Linux**:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup update stable
cargo install --locked --git https://github.com/one-chain-labs/onechain.git one_chain --features tracing
mv ~/.cargo/bin/one_chain ~/.cargo/bin/one
```

**Verify installation**:
```bash
one --version
```

### 2. Configure OneChain Client

```bash
one client
# Press y to connect to OneChain Full node server
# Press Enter for default (Testnet)
# Or enter custom RPC URL for different network
# Select key scheme: 0 for ed25519 (recommended)
```

### 3. Create/Import Wallet

**Create new wallet**:
```bash
one client new-address ed25519
# Save the recovery phrase in a secure location!
```

**Import existing wallet**:
```bash
one keytool import "your recovery phrase" ed25519
```

**View all addresses**:
```bash
one keytool list
```

### 4. Get Testnet Tokens

```bash
# Via CLI
one client faucet

# Or via cURL
curl --location --request POST 'https://faucet-testnet.onelabs.cc/v1/gas' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "FixedAmountRequest": {
      "recipient": "0xYOUR_ADDRESS"
    }
  }'
```

Verify balance:
```bash
one client balance
```

## Building

### Compile Move Package

```bash
cd contracts
npm run build

# Or directly:
one move build --path game_manager
```

Expected output:
```
UPDATING GIT DEPENDENCY https://github.com/one-chain-labs/onechain.git
INCLUDING DEPENDENCY One
INCLUDING DEPENDENCY MoveStdlib
BUILDING game_manager
Compiling game_manager for Move version 2024.beta
SUCCESS Building package at: d:/Trust/contracts/game_manager
```

### Successful Build Results

The build creates:
- `game_manager/.move` directory (compiled bytecode)
- Module ready for publication

## Testing

### Run Test Suite

```bash
npm run test

# Or directly:
one move test --path game_manager
```

### Tests Included

The test suite validates:

1. **Player Management**
   - Player registration
   - Reputation initialization
   - Account creation

2. **Staking**
   - Token staking
   - Token withdrawal
   - Balance validation

3. **Match Lifecycle**
   - Match creation
   - Player assignment
   - Status transitions

4. **Commit-Reveal Scheme**
   - Choice commitment (hash)
   - Choice reveal (with salt)
   - Hash verification
   - Phase progression

5. **Payoff Calculation**
   - Cooperate/Cooperate → 50/50
   - Cooperate/Betray → 0/100
   - Betray/Cooperate → 100/0
   - Betray/Betray → 0/0
   - Abstain → 25/25 (all combinations)

6. **Match Resolution**
   - Automatic resolution when both choices revealed
   - Correct reward distribution
   - Status updates

Expected output:
```
BUILDING game_manager
Running Move unit tests
[ PASS    ] 0x0::game_manager::test_player_registration
[ PASS    ] 0x0::game_manager::test_commit_reveal_flow
[ PASS    ] 0x0::game_manager::test_match_resolution_payoffs
Test result: OK. Total tests: 3; passed: 3; failed: 0
```

## Publishing

### 1. Switch to Target Network

**Testnet** (for development):
```bash
one client switch --env testnet
```

**Mainnet** (production):
```bash
one client switch --env mainnet
```

Verify active network:
```bash
one client envs
```

### 2. Publish Package

```bash
npm run publish:testnet

# Or directly:
one move publish --path game_manager --gas-budget 10000000
```

### 3. Understand Output

Example publication output:
```
Publishing Modules = [game_manager]
To Package ID: 0xf9f2ff54d2a2ac18ac86a2d7b6d4b8...

Transaction Effects:
- Status: Success
- Package ID: 0xf9f2ff54d2a2ac18ac86a2d7b6d4b8...
- Modules: game_manager

Transaction Digest: 0xabc123...
```

**Save the Package ID!** You need it for all function calls.

## Post-Publication

### 1. Record Deployment Info

Create `contracts/deployments/testnet.json`:

```json
{
  "network": "testnet",
  "chain_id": 4002,
  "rpc": "https://rpc-testnet.onelabs.cc:443",
  "package_id": "0xf9f2ff54d2a2ac18ac86a2d7b6d4b8...",
  "modules": {
    "game_manager": "0xf9f2ff54d2a2ac18ac86a2d7b6d4b8::game_manager"
  },
  "published_at": "2025-11-16T12:00:00Z",
  "deployer": "0x123456...",
  "gas_used": 5234567
}
```

### 2. Verify Package

```bash
one client object <PACKAGE_ID>
```

### 3. Update Frontend

Add to `frontend/.env.local`:

```env
VITE_ONECHAIN_PACKAGE_ID=0xf9f2ff54d2a2ac18ac86a2d7b6d4b8...
VITE_ONECHAIN_MODULE=game_manager
VITE_ONECHAIN_RPC=https://rpc-testnet.onelabs.cc:443
VITE_ONECHAIN_CHAIN_ID=4002
```

## Calling Functions via CLI

### Register Player

```bash
one client call \
  --package 0xf9f2... \
  --module game_manager \
  --function register_player \
  --gas-budget 1000000
```

### Create Match

```bash
one client call \
  --package 0xf9f2... \
  --module game_manager \
  --function create_match \
  --args 0xPlayer1Addr 0xPlayer2Addr 100 \
  --gas-budget 2000000
```

### Stake Tokens

```bash
one client call \
  --package 0xf9f2... \
  --module game_manager \
  --function stake_tokens \
  --args <PLAYER_OBJECT_ID> <COIN_OBJECT_ID> \
  --gas-budget 1000000
```

### Commit Choice

```bash
one client call \
  --package 0xf9f2... \
  --module game_manager \
  --function commit_choice \
  --args <MATCH_OBJECT_ID> "[0, 42]" \
  --gas-budget 1000000
```

### Reveal Choice

```bash
one client call \
  --package 0xf9f2... \
  --module game_manager \
  --function reveal_choice \
  --args <MATCH_OBJECT_ID> 0 "[42]" \
  --gas-budget 1000000
```

## Network Details

### Testnet Configuration

| Property | Value |
|----------|-------|
| Network Name | OneChain Testnet |
| Chain ID | 4002 |
| RPC Endpoint | https://rpc-testnet.onelabs.cc:443 |
| Gas Token | OCT |
| Faucet | https://faucet-testnet.onelabs.cc |
| Explorer | https://testnet-explorer.onelabs.cc |
| Block Time | ~1-2 seconds |

### Mainnet Configuration

| Property | Value |
|----------|-------|
| Network Name | OneChain Mainnet |
| Chain ID | 1088 |
| RPC Endpoint | https://rpc-mainnet.onelabs.cc:443 |
| Gas Token | OCT (real value) |
| Faucet | None |
| Explorer | https://explorer.onelabs.cc |
| Block Time | ~1-2 seconds |

## Troubleshooting

### Build Errors

**Error: "Package not found"**
```bash
# Ensure you're in the correct directory
cd contracts
one move build --path game_manager
```

**Error: "Dependency compilation failed"**
```bash
# Clear build cache and retry
one move clean --path game_manager
one move build --path game_manager
```

### Publication Errors

**Error: "Insufficient gas"**
```bash
# Increase gas budget
one move publish --path game_manager --gas-budget 20000000
```

**Error: "Invalid private key"**
```bash
# Verify active address
one client active-address

# Switch if needed
one client switch-address
```

**Error: "Connection timeout"**
```bash
# Verify network availability
curl https://rpc-testnet.onelabs.cc:443 \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"chain_getChainId","id":1}'
```

### Function Call Errors

**Error: "Object not found"**
```bash
# List your objects
one client objects

# Or find a specific object
one client object <OBJECT_ID>
```

**Error: "Invalid object type"**
```bash
# Verify you're passing the correct object ID
# Check object ownership
one client object <OBJECT_ID> --full
```

## Helpful Commands

### Wallet Management

```bash
# List all addresses
one keytool list

# Switch active address
one keytool select

# Export public key
one keytool export-public-key <ADDRESS>
```

### Network Management

```bash
# List configured networks
one client envs

# Add custom network
one client new-env --alias custom --rpc <RPC_URL>

# Switch network
one client switch --env testnet
```

### Object Management

```bash
# List all objects
one client objects

# View specific object details
one client object <OBJECT_ID>

# Get full object info
one client object <OBJECT_ID> --full

# Get object history
one client object-history <OBJECT_ID>
```

### Transaction Monitoring

```bash
# View transaction history
one client tx-history

# View specific transaction
one client tx <DIGEST>

# Watch recent transactions
one client tx-history --recent
```

## Environment Variables

Create `.env` in contracts directory:

```env
# Network
ONE_CHAIN_NETWORK=testnet
ONE_CHAIN_RPC=https://rpc-testnet.onelabs.cc:443

# Package Deployment
GAME_MANAGER_PACKAGE_ID=0x...
GAS_BUDGET=10000000

# Account (optional, for automation)
ONE_ACCOUNT_ADDRESS=0x...
ONE_ACCOUNT_SECRET_SEED=...
```

## Git Workflow

### Before Commit

```bash
npm run lint      # Check code style
npm run test      # Run tests
npm run build     # Verify compilation
```

### Deployment Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Code compiles cleanly (`npm run build`)
- [ ] Have sufficient testnet tokens (`one client balance`)
- [ ] Switch to correct network (`one client envs`)
- [ ] Saved package ID after publish
- [ ] Updated deployment JSON
- [ ] Updated frontend .env

## Next Steps

1. ✅ Build: `npm run build`
2. ✅ Test: `npm run test`
3. ✅ Publish: `npm run publish:testnet`
4. ✅ Save package ID to `deployments/testnet.json`
5. Update `frontend/.env.local` with package ID
6. Implement TypeScript SDK integration in frontend
7. Test frontend interactions
8. Deploy frontend to staging
9. Prepare for mainnet deployment

## Resources

- [OneChain Official Docs](https://docs.onelabs.cc)
- [Move Language Book](https://move-language.github.io/move/)
- [OneChain Explorer](https://testnet-explorer.onelabs.cc)
- [OneChain GitHub](https://github.com/one-chain-labs/onechain)
- [Move Examples](https://github.com/one-chain-labs/onechain/tree/main/examples)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review test files for usage examples
3. Check OneChain documentation
4. Open an issue on GitHub

