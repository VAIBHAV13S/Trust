// OneChain SDK Client
// Initializes the @onelabs/sui client for interacting with OneChain

import { getFullnodeUrl, SuiClient } from '@onelabs/sui/client';
import type { SuiTransactionBlockResponse } from '@onelabs/sui/client';
import { ONE_CHAIN_CONFIG } from '@/config/onechain';

// Initialize Sui client for OneChain
export const createOneChainClient = (): SuiClient => {
  return new SuiClient({
    url: ONE_CHAIN_CONFIG.rpc || getFullnodeUrl('testnet'),
  });
};

export const oneChainClient = createOneChainClient();

// Helper: Get current chain ID
export const getCurrentChainId = (): number => {
  return ONE_CHAIN_CONFIG.chainId || 4002;
};

// Helper: Check if address is valid OneChain address
export const isValidOneChainAddress = (address: string): boolean => {
  // OneChain addresses follow Sui format: 0x + 40 hex characters (or shortened)
  return /^0x[a-fA-F0-9]{1,}$/.test(address);
};

// Helper: Normalize address to full format
export const normalizeAddress = (address: string): string => {
  if (!isValidOneChainAddress(address)) {
    throw new Error('Invalid OneChain address format');
  }
  
  // Pad address to 64 hex chars (32 bytes)
  const hex = address.slice(2);
  const padded = hex.padStart(64, '0');
  return `0x${padded}`;
};

// Helper: Format address for display
export const formatAddress = (address: string, length: number = 8): string => {
  const normalized = normalizeAddress(address);
  return `${normalized.slice(0, length)}...${normalized.slice(-length)}`;
};

// Helper: Check transaction status
export const checkTransactionStatus = async (
  txDigest: string
): Promise<SuiTransactionBlockResponse | null> => {
  try {
    const result = await oneChainClient.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });
    return result;
  } catch (error) {
    console.error('Error checking transaction status:', error);
    return null;
  }
};

// Helper: Wait for transaction confirmation
export const waitForTransaction = async (
  txDigest: string,
  maxAttempts: number = 30,
  delayMs: number = 1000
): Promise<SuiTransactionBlockResponse | null> => {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await checkTransactionStatus(txDigest);
    
    if (result) {
      return result;
    }
    
    if (i < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  
  return null;
};

// Helper: Get transaction effect
export const getTransactionEffect = (txResponse: SuiTransactionBlockResponse) => {
  return txResponse.effects;
};

// Helper: Check if transaction was successful
export const isTransactionSuccessful = (txResponse: SuiTransactionBlockResponse): boolean => {
  const effect = getTransactionEffect(txResponse);
  return effect?.status?.status === 'success';
};
