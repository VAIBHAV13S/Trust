// OneChain Configuration
// Sets up RPC endpoint, contract address, and network parameters

export const ONE_CHAIN_CONFIG = {
  // Contract Details
  packageId: import.meta.env.VITE_ONECHAIN_PACKAGE_ID || '0x0',
  module: 'game_manager',
  gameStateId: import.meta.env.VITE_ONECHAIN_GAME_STATE_ID || '0x6',
  
  // Network Configuration
  rpc: import.meta.env.VITE_ONECHAIN_RPC || 'https://rpc-testnet.onelabs.cc:443',
  chainId: parseInt(import.meta.env.VITE_ONECHAIN_CHAIN_ID || '4002'),
  
  // Transaction Defaults
  gasBudget: parseInt(import.meta.env.VITE_ONECHAIN_GAS_BUDGET || '10000000'),
  
  // Network Names
  networks: {
    testnet: {
      name: 'OneChain Testnet',
      chainId: 4002,
      rpc: 'https://rpc-testnet.onelabs.cc:443',
      faucet: 'https://faucet-testnet.onelabs.cc',
      explorer: 'https://testnet-explorer.onelabs.cc',
    },
    mainnet: {
      name: 'OneChain Mainnet',
      chainId: 1088,
      rpc: 'https://rpc-mainnet.onelabs.cc:443',
      faucet: null,
      explorer: 'https://explorer.onelabs.cc',
    },
  },
};

export const GAME_CHOICES = {
  COOPERATE: 0,
  BETRAY: 1,
  ABSTAIN: 2,
} as const;

export const CHOICE_NAMES: Record<number, string> = {
  0: 'Cooperate',
  1: 'Betray',
  2: 'Abstain',
};

export const PAYOFF_MATRIX = {
  'cooperate-cooperate': { p1: 50, p2: 50 },
  'cooperate-betray': { p1: 0, p2: 100 },
  'betray-cooperate': { p1: 100, p2: 0 },
  'betray-betray': { p1: 0, p2: 0 },
  'abstain-abstain': { p1: 25, p2: 25 },
  'cooperate-abstain': { p1: 25, p2: 25 },
  'betray-abstain': { p1: 25, p2: 25 },
  'abstain-cooperate': { p1: 25, p2: 25 },
  'abstain-betray': { p1: 25, p2: 25 },
};
