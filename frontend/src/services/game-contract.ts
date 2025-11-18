// Game Contract Service
// Wraps Move contract entry functions for the Trust Game

import { Transaction } from '@mysten/sui/transactions';
import { oneChainClient } from './onechain-client';
import { ONE_CHAIN_CONFIG } from '@/config/onechain';

const PKG_ID = ONE_CHAIN_CONFIG.packageId;
const MODULE = ONE_CHAIN_CONFIG.module;
const GAME_STATE_ID = ONE_CHAIN_CONFIG.gameStateId || '0x6';

/**
 * Register a new player in the game
 * @returns Transaction ready to sign and execute
 */
export const createRegisterPlayerTx = (): Transaction => {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PKG_ID}::${MODULE}::register_player`,
    arguments: [
      tx.object(GAME_STATE_ID),
    ],
  });
  
  return tx;
};

/**
 * Stake tokens in the game
 * @returns Transaction ready to sign and execute
 */
export const createStakeTokensTx = (
  matchObjectId: string,
  amount: bigint
): Transaction => {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PKG_ID}::${MODULE}::stake_tokens`,
    arguments: [
      // On-chain match object (Sui shared object id), not the backend matchId string.
      tx.object(matchObjectId),
      tx.pure.u64(amount),
    ],
  });
  
  return tx;
};

/**
 * Create a new match between two players
 * @param opponent The opponent's wallet address
 * @param stakeAmount The stake amount in MIST
 * @returns Transaction ready to sign and execute
 */
export const createMatchTx = (
  opponent: string,
  stakeAmount: bigint
): Transaction => {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PKG_ID}::${MODULE}::create_match`,
    arguments: [
      tx.object(GAME_STATE_ID),
      tx.pure.address(opponent),
      tx.pure.u64(stakeAmount),
    ],
  });
  
  return tx;
};

/**
 * Commit a choice with a hash (commit phase)
 * @param matchId The match object ID
 * @param choiceHash The Keccak256 hash of (choice || salt)
 * @returns Transaction ready to sign and execute
 */
export const createCommitChoiceTx = (
  matchId: string,
  choiceHash: string
): Transaction => {
  const tx = new Transaction();
  
  // Convert hex string to vector<u8>
  const hashBytes = Array.from(Buffer.from(choiceHash.slice(2), 'hex'));
  
  tx.moveCall({
    target: `${PKG_ID}::${MODULE}::commit_choice`,
    arguments: [
      tx.object(matchId),
      tx.pure.vector('u8', hashBytes),
    ],
  });
  
  return tx;
};

/**
 * Reveal a choice (reveal phase)
 * @param matchId The match object ID
 * @param choice The actual choice (0=Cooperate, 1=Betray, 2=Abstain)
 * @param salt The salt used in the hash
 * @returns Transaction ready to sign and execute
 */
export const createRevealChoiceTx = (
  matchId: string,
  choice: 0 | 1 | 2,
  salt: bigint
): Transaction => {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PKG_ID}::${MODULE}::reveal_choice`,
    arguments: [
      tx.object(matchId),
      tx.pure.u8(choice),
      tx.pure.u64(salt),
    ],
  });
  
  return tx;
};

/**
 * Claim winnings after a match resolves
 * @param matchId The match object ID
 * @returns Transaction ready to sign and execute
 */
export const createClaimWinningsTx = (matchId: string): Transaction => {
  const tx = new Transaction();
  
  tx.moveCall({
    target: `${PKG_ID}::${MODULE}::claim_winnings`,
    arguments: [
      tx.object(matchId),
    ],
  });
  
  return tx;
};

/**
 * Get match details
 * @param matchId The match object ID
 * @returns Match object data
 */
export const getMatchDetails = async (matchId: string) => {
  try {
    const object = await oneChainClient.getObject({
      id: matchId,
      options: {
        showContent: true,
        showOwner: true,
      },
    });
    return object;
  } catch (error) {
    console.error('Error fetching match details:', error);
    return null;
  }
};

/**
 * Get player details
 * @param playerId The player object ID
 * @returns Player object data
 */
export const getPlayerDetails = async (playerId: string) => {
  try {
    const object = await oneChainClient.getObject({
      id: playerId,
      options: {
        showContent: true,
        showOwner: true,
      },
    });
    return object;
  } catch (error) {
    console.error('Error fetching player details:', error);
    return null;
  }
};

/**
 * Get GameState object
 * @returns GameState object data
 */
export const getGameState = async () => {
  try {
    const object = await oneChainClient.getObject({
      id: GAME_STATE_ID,
      options: {
        showContent: true,
      },
    });
    return object;
  } catch (error) {
    console.error('Error fetching game state:', error);
    return null;
  }
};

/**
 * Get all events for a match
 * @returns Array of events related to the match
 */
export const getMatchEvents = async () => {
  try {
    const events = await oneChainClient.queryEvents({
      query: {
        MoveModule: {
          package: PKG_ID,
          module: MODULE,
        },
      },
    });
    
    return events.data;
  } catch (error) {
    console.error('Error fetching match events:', error);
    return [];
  }
};
