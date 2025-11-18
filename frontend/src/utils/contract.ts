// Contract Utilities for OneChain
// Provides functions for loading and interacting with Move contracts

import { oneChainClient } from '@/services/onechain-client';
import { ONE_CHAIN_CONFIG } from '@/config/onechain';

interface ContractConfig {
  packageId: string;
  module: string;
  functions: Record<string, string>;
}

/**
 * Loads contract configuration from OneChain settings
 */
export async function loadContractConfig(contractName: string): Promise<ContractConfig> {
  // Get configuration from OneChain config
  if (contractName.toLowerCase() === 'gamemanager') {
    return {
      packageId: ONE_CHAIN_CONFIG.packageId,
      module: ONE_CHAIN_CONFIG.module,
      functions: {
        register_player: `${ONE_CHAIN_CONFIG.packageId}::${ONE_CHAIN_CONFIG.module}::register_player`,
        stake_tokens: `${ONE_CHAIN_CONFIG.packageId}::${ONE_CHAIN_CONFIG.module}::stake_tokens`,
        create_match: `${ONE_CHAIN_CONFIG.packageId}::${ONE_CHAIN_CONFIG.module}::create_match`,
        commit_choice: `${ONE_CHAIN_CONFIG.packageId}::${ONE_CHAIN_CONFIG.module}::commit_choice`,
        reveal_choice: `${ONE_CHAIN_CONFIG.packageId}::${ONE_CHAIN_CONFIG.module}::reveal_choice`,
        claim_winnings: `${ONE_CHAIN_CONFIG.packageId}::${ONE_CHAIN_CONFIG.module}::claim_winnings`,
      },
    };
  }

  throw new Error(`Contract ${contractName} not found in configuration`);
}

/**
 * Gets the current network name
 */
export function getNetworkName(): string {
  const chainId = ONE_CHAIN_CONFIG.chainId;

  switch (chainId) {
    case 1088:
      return 'mainnet';
    case 4002:
      return 'testnet';
    default:
      return `chain-${chainId}`;
  }
}

/**
 * Verifies that a Move package is published
 */
export async function verifyPackagePublished(packageId: string): Promise<boolean> {
  try {
    const movePackage = await oneChainClient.getObject({
      id: packageId,
    });
    return movePackage.data?.type?.includes('Package') ?? false;
  } catch {
    return false;
  }
}

/**
 * Gets GameManager contract configuration
 */
export async function getGameManagerConfig(): Promise<ContractConfig> {
  return loadContractConfig('GameManager');
}

/**
 * Wrapper for Move contract interactions
 */
export class GameManagerWrapper {
  config: ContractConfig;

  constructor(config: ContractConfig) {
    this.config = config;
  }

  static async create(): Promise<GameManagerWrapper> {
    const config = await getGameManagerConfig();
    return new GameManagerWrapper(config);
  }

  /**
   * Get the full path for a function
   */
  getFunctionPath(functionName: string): string {
    return this.config.functions[functionName] || '';
  }

  /**
   * Register player (returns function path for transaction)
   */
  getRegisterPlayerFunction(): string {
    return this.getFunctionPath('register_player');
  }

  /**
   * Stake tokens (returns function path for transaction)
   */
  getStakeTokensFunction(): string {
    return this.getFunctionPath('stake_tokens');
  }

  /**
   * Create match (returns function path for transaction)
   */
  getCreateMatchFunction(): string {
    return this.getFunctionPath('create_match');
  }

  /**
   * Commit choice (returns function path for transaction)
   */
  getCommitChoiceFunction(): string {
    return this.getFunctionPath('commit_choice');
  }

  /**
   * Reveal choice (returns function path for transaction)
   */
  getRevealChoiceFunction(): string {
    return this.getFunctionPath('reveal_choice');
  }

  /**
   * Claim winnings (returns function path for transaction)
   */
  getClaimWinningsFunction(): string {
    return this.getFunctionPath('claim_winnings');
  }
}
