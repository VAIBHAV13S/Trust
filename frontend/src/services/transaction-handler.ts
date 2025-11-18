// Transaction Service
// Handles signing and executing transactions on OneChain
 
import type { SuiTransactionBlockResponse } from '@onelabs/sui/client';
import { oneChainClient, waitForTransaction, isTransactionSuccessful } from './onechain-client';
import { ONE_CHAIN_CONFIG } from '@/config/onechain';

interface TransactionOptions {
  showEvents?: boolean;
  showEffects?: boolean;
  showObjectChanges?: boolean;
}

/**
 * Execute a signed transaction
 * @param txBytes The signed transaction bytes
 * @param signature The transaction signature
 * @returns Transaction response with effects and events
 */
export const executeTransaction = async (
  txBytes: string,
  signature: string,
  options: TransactionOptions = {}
): Promise<SuiTransactionBlockResponse | null> => {
  try {
    const response = await oneChainClient.executeTransactionBlock({
      transactionBlock: txBytes,
      signature: signature,
      options: {
        showEvents: options.showEvents ?? true,
        showEffects: options.showEffects ?? true,
        showObjectChanges: options.showObjectChanges ?? true,
      },
    });

    return response;
  } catch (error) {
    console.error('Error executing transaction:', error);
    return null;
  }
};

/**
 * Execute a transaction and wait for confirmation
 * @param txBytes The signed transaction bytes
 * @param signature The transaction signature
 * @param maxAttempts Maximum attempts to check confirmation
 * @param delayMs Delay between attempts in milliseconds
 * @returns Confirmed transaction response
 */
export const executeAndConfirm = async (
  txBytes: string,
  signature: string,
  maxAttempts: number = 30,
  delayMs: number = 1000
): Promise<SuiTransactionBlockResponse | null> => {
  try {
    const response = await executeTransaction(txBytes, signature);

    if (!response?.digest) {
      console.error('No transaction digest returned');
      return null;
    }

    // Wait for confirmation
    const confirmedTx = await waitForTransaction(
      response.digest,
      maxAttempts,
      delayMs
    );

    if (confirmedTx && isTransactionSuccessful(confirmedTx)) {
      return confirmedTx;
    }

    return null;
  } catch (error) {
    console.error('Error executing and confirming transaction:', error);
    return null;
  }
};

/**
 * Get default gas budget
 * @returns Gas budget in MIST
 */
export const getDefaultGasBudget = (): bigint => {
  return BigInt(ONE_CHAIN_CONFIG.gasBudget);
};

/**
 * Format transaction effect for display
 * @param response Transaction response
 * @returns Formatted effect object
 */
export const formatTransactionEffect = (response: SuiTransactionBlockResponse) => {
  const effect = response.effects;

  return {
    status: effect?.status?.status,
    gasUsed: {
      computationCost: effect?.gasUsed?.computationCost,
      storageCost: effect?.gasUsed?.storageCost,
      storageRebate: effect?.gasUsed?.storageRebate,
    },
    created: effect?.created,
    mutated: effect?.mutated,
    deleted: effect?.deleted,
    events: response.events,
  };
};

/**
 * Extract created objects from transaction response
 * @param response Transaction response
 * @returns Array of created object references
 */
export const getCreatedObjects = (response: SuiTransactionBlockResponse) => {
  return response.effects?.created || [];
};

/**
 * Extract events from transaction response
 * @param response Transaction response
 * @returns Array of transaction events
 */
export const getTransactionEvents = (response: SuiTransactionBlockResponse) => {
  return response.events || [];
};

/**
 * Check if transaction contains an error
 * @param response Transaction response
 * @returns Error message if present, null otherwise
 */
export const getTransactionError = (response: SuiTransactionBlockResponse): string | null => {
  if (response.effects?.status?.status !== 'success') {
    return response.effects?.status?.error || 'Transaction failed';
  }
  return null;
};
