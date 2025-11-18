// useWallet Hook
// Manages OneChain wallet connection and signing

import { useState, useEffect, useCallback } from 'react';
import { normalizeAddress, formatAddress } from '@/services/onechain-client';

interface WalletState {
  isConnected: boolean;
  account: string | null;
  publicKey: string | null;
  loading: boolean;
  error: string | null;
}

export const useWallet = () => {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    account: null,
    publicKey: null,
    loading: true,
    error: null,
  });

  // Check if wallet is available and connected
  useEffect(() => {
    const initWallet = async () => {
      try {
        if (!window.OneChainWallet) {
          setWallet((prev) => ({
            ...prev,
            loading: false,
            error: 'OneChain Wallet not installed. Please install the extension.',
          }));
          return;
        }

        // Try to get current account
        const account = await window.OneChainWallet.getAccount();
        if (account) {
          setWallet({
            isConnected: true,
            account: normalizeAddress(account.address),
            publicKey: null,
            loading: false,
            error: null,
          });
        } else {
          setWallet((prev) => ({
            ...prev,
            loading: false,
          }));
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setWallet((prev) => ({
          ...prev,
          loading: false,
          error: errorMsg,
        }));
      }
    };

    initWallet();
  }, []);

  // Connect to wallet
  const connect = useCallback(async () => {
    if (!window.OneChainWallet) {
      setWallet((prev) => ({
        ...prev,
        error: 'OneChain Wallet not installed',
      }));
      return false;
    }

    try {
      setWallet((prev) => ({ ...prev, loading: true, error: null }));
      const result = await window.OneChainWallet.requestConnection();
      
      const normalizedAddress = normalizeAddress(result.address);
      setWallet({
        isConnected: true,
        account: normalizedAddress,
        publicKey: result.publicKey,
        loading: false,
        error: null,
      });
      
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection failed';
      setWallet((prev) => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }));
      return false;
    }
  }, []);

  // Disconnect from wallet
  const disconnect = useCallback(async () => {
    try {
      if (window.OneChainWallet) {
        await window.OneChainWallet.disconnect();
      }
      setWallet({
        isConnected: false,
        account: null,
        publicKey: null,
        loading: false,
        error: null,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Disconnect failed';
      setWallet((prev) => ({
        ...prev,
        error: errorMsg,
      }));
    }
  }, []);

  // Get display address
  const displayAddress = wallet.account ? formatAddress(wallet.account) : null;

  return {
    ...wallet,
    displayAddress,
    connect,
    disconnect,
  };
};
