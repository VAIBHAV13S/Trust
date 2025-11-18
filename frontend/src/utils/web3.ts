// OneChain Wallet Utilities
// Provides web3 utilities for connecting to OneChain wallets

import { oneChainClient, normalizeAddress } from '@/services/onechain-client';

type AddressLike = { address?: string }

const extractSignature = (
  result: { signature?: string; sig?: string; signedMessage?: string } | string | undefined | null
) => {
  if (!result) return undefined

  if (typeof result === 'string') {
    return result
  }

  return result.signature ?? result.sig ?? result.signedMessage
}

export const signWalletMessage = async (message: string, walletAddress: string): Promise<string> => {
  if (!message) {
    throw new Error('Message is required for signing.')
  }

  if (!walletAddress) {
    throw new Error('Wallet address is required for signing.')
  }

  const provider = resolveProvider()

  if (!provider) {
    throw new Error('OneWallet extension not found. Please install and unlock OneWallet before signing.')
  }

  const encoder = new TextEncoder()
  const messageBytes = encoder.encode(message)

  const attempts: (() => Promise<string | undefined>)[] = []

  const signPersonalMessage = provider.signPersonalMessage?.bind(provider)
  const signMessage = provider.signMessage?.bind(provider)

  const account = { address: walletAddress }

  if (signPersonalMessage) {
    attempts.push(() =>
      signPersonalMessage({ message: messageBytes, account } as any).then(extractSignature)
    )
  }

  if (signMessage) {
    attempts.push(() =>
      signMessage({ message: messageBytes, account } as any).then(extractSignature)
    )
  }

  for (const attempt of attempts) {
    try {
      const signature = await attempt()
      if (signature) {
        return signature
      }
    } catch (error) {
      console.warn('Wallet sign attempt failed, trying next method:', error)
    }
  }

  throw new Error('Connected wallet does not support message signing or the request was rejected.')
}

const isAddressLike = (value: unknown): value is AddressLike =>
  typeof value === 'object' && value !== null && 'address' in value

type WalletProvider = {
  requestConnection?: () => Promise<{ address: string; publicKey: string }>
  connect?: () => Promise<any>
  connectWallet?: () => Promise<{ address?: string; publicKey?: string }>
  requestAccounts?: () => Promise<string[]>
  getAccounts?: () => Promise<string[]>
  getPublicKey?: () => Promise<string>
  signMessage?: (payload: { message: string | Uint8Array; account?: { address: string } }) => Promise<{ signature?: string } | string>
  signPersonalMessage?: (payload: { message: string | Uint8Array; account?: { address: string } }) => Promise<{ signature?: string } | string>
  signTransactionBlock?: (payload: any) => Promise<any>
  signAndExecuteTransactionBlock?: (payload: any) => Promise<any>
  disconnect?: () => Promise<void>
  getAccount?: () => Promise<{ address: string } | null>
  account?: AddressLike
  accounts?: (string | AddressLike)[]
  address?: string
  publicKey?: string
}

/**
 * Connect to OneChain Wallet
 * Returns wallet connection details
 */
export const resolveProvider = () => {
  const win = window as Window & Record<string, any>
  return (
    win.OneWallet ??
    win.oneWallet ??
    win.OneChainWallet ??
    win.onechainWallet ??
    win.cosmostationWallet ??
    win.CosmostationWallet
  ) as WalletProvider | undefined
}

export const connectWallet = async () => {
  const provider = resolveProvider()
  if (!provider) {
    throw new Error('OneWallet extension not found. Please install and unlock OneWallet before connecting.');
  }

  try {
    console.log('🔍 Provider found:', Object.keys(provider));
    
    // First, establish connection
    let connectionEstablished = false;
    
    if (provider.requestConnection) {
      console.log('📞 Trying requestConnection...');
      const conn = await provider.requestConnection()
      console.log('✅ requestConnection response:', conn);
      if (conn?.address) {
        // Direct address in response
        const publicKey = conn.publicKey ? normalizeAddress(conn.publicKey) : '';
        const normalizedAddress = normalizeAddress(conn.address);
        return await fetchBalanceAndReturn(normalizedAddress, publicKey);
      }
      connectionEstablished = true;
    }
    
    if (!connectionEstablished && provider.connect) {
      console.log('📞 Trying connect...');
      const conn = await provider.connect()
      console.log('✅ connect response:', conn);
      connectionEstablished = true;
    }
    
    if (!connectionEstablished && provider.connectWallet) {
      console.log('📞 Trying connectWallet...');
      const conn = await provider.connectWallet()
      console.log('✅ connectWallet response:', conn);
      if (conn?.address) {
        const publicKey = conn.publicKey ? normalizeAddress(conn.publicKey) : '';
        const normalizedAddress = normalizeAddress(conn.address);
        return await fetchBalanceAndReturn(normalizedAddress, publicKey);
      }
      connectionEstablished = true;
    }

    console.log('🔍 Connection established, now fetching accounts...');

    let resolvedAddress: string | undefined;
    let resolvedPublicKey = '';

    // Try getAccounts (most common for OneWallet)
    if (provider.getAccounts) {
      console.log('📞 Trying getAccounts...');
      try {
        const accounts = await provider.getAccounts();
        console.log('✅ getAccounts response:', accounts);
        if (accounts && accounts.length > 0) {
          resolvedAddress = accounts[0];
          console.log('✅ Found address in getAccounts[0]:', resolvedAddress);
        }
      } catch (err) {
        console.warn('⚠️ getAccounts failed:', err);
      }
    }

    // Try getPublicKey
    if (provider.getPublicKey && !resolvedPublicKey) {
      console.log('📞 Trying getPublicKey...');
      try {
        resolvedPublicKey = await provider.getPublicKey();
        console.log('✅ getPublicKey response:', resolvedPublicKey);
      } catch (err) {
        console.warn('⚠️ getPublicKey failed:', err);
      }
    }

    // Fallback to requestAccounts
    if (!resolvedAddress && provider.requestAccounts) {
      console.log('📞 Trying requestAccounts...');
      try {
        const accounts = await provider.requestAccounts();
        console.log('✅ requestAccounts response:', accounts);
        if (accounts && accounts.length > 0) {
          resolvedAddress = accounts[0];
          console.log('✅ Found address in requestAccounts[0]:', resolvedAddress);
        }
      } catch (err) {
        console.warn('⚠️ requestAccounts failed:', err);
      }
    }

    // Try getAccount
    if (!resolvedAddress && provider.getAccount) {
      console.log('📞 Trying getAccount...');
      try {
        const account = await provider.getAccount();
        console.log('✅ getAccount response:', account);
        if (account?.address) {
          resolvedAddress = account.address;
          console.log('✅ Found address in getAccount.address:', resolvedAddress);
        }
      } catch (err) {
        console.warn('⚠️ getAccount failed:', err);
      }
    }

    // Check provider properties
    if (!resolvedAddress && provider.accounts?.length) {
      const firstAccount = provider.accounts[0]
      if (typeof firstAccount === 'string') {
        resolvedAddress = firstAccount
      } else if (isAddressLike(firstAccount)) {
        resolvedAddress = firstAccount.address
      }

      if (resolvedAddress) {
        console.log('✅ Found address in provider.accounts[0]:', resolvedAddress)
      }
    }

    if (!resolvedAddress) {
      const accountProp = provider.account
      if (isAddressLike(accountProp) && accountProp?.address) {
        resolvedAddress = accountProp.address
        console.log('✅ Found address in provider.account.address:', resolvedAddress)
      }
    }

    if (!resolvedAddress && provider.address) {
      resolvedAddress = provider.address;
      console.log('✅ Found address in provider.address:', resolvedAddress);
    }

    if (!resolvedAddress) {
      console.error('❌ Could not resolve address from any source');
      console.error('Full provider object:', provider);
      throw new Error('Failed to connect wallet, no address returned. Please ensure your wallet is unlocked and try again.');
    }

    console.log('✅ Resolved address:', resolvedAddress);
    const normalizedAddress = normalizeAddress(resolvedAddress);
    const publicKey = resolvedPublicKey ? normalizeAddress(resolvedPublicKey) : '';
    
    return await fetchBalanceAndReturn(normalizedAddress, publicKey);
    
  } catch (error) {
    console.error('❌ Failed to connect wallet:', error);
    throw error;
  }
};

/**
 * Helper function to fetch balance and return wallet data
 */
async function fetchBalanceAndReturn(normalizedAddress: string, publicKey: string) {
  console.log('✅ Normalized address:', normalizedAddress);
  
  // Get balance from OneChain
  try {
    const coins = await oneChainClient.getCoins({
      owner: normalizedAddress,
      coinType: '0x2::one::ONE',
    });
    
    const totalBalance = coins.data.reduce((sum, coin) => {
      const balance = BigInt(coin.balance || 0);
      return sum + balance;
    }, BigInt(0));

    console.log('✅ Wallet connected successfully:', { address: normalizedAddress, balance: totalBalance });

    return {
      address: normalizedAddress,
      publicKey,
      balance: totalBalance,
    };
  } catch (error) {
    console.warn('⚠️ Balance fetch failed, returning 0:', error);
    // Fallback if balance fetch fails
    return {
      address: normalizedAddress,
      publicKey,
      balance: BigInt(0),
    };
  }
}

/**
 * Disconnect from wallet
 */
export const disconnectWallet = async () => {
  try {
    const provider = resolveProvider()
    await provider?.disconnect?.()
  } catch (error) {
    console.error('Failed to disconnect wallet:', error);
  }
  
  // Clear local storage
  localStorage.removeItem('walletAddress');
  localStorage.removeItem('walletPublicKey');
  localStorage.removeItem('token');
};

/**
 * Get wallet from local storage
 */
export const getWalletFromLocalStorage = async () => {
  const address = localStorage.getItem('walletAddress');
  if (!address) return null;

  try {
    const normalizedAddress = normalizeAddress(address);
    
    // Get current balance
    const coins = await oneChainClient.getCoins({
      owner: normalizedAddress,
      coinType: '0x2::one::ONE',
    });
    
    const totalBalance = coins.data.reduce((sum, coin) => {
      const balance = BigInt(coin.balance || 0);
      return sum + balance;
    }, BigInt(0));

    return {
      address: normalizedAddress,
      publicKey: localStorage.getItem('walletPublicKey'),
      balance: totalBalance,
    };
  } catch (error) {
    console.error('Failed to get wallet from storage:', error);
    return null;
  }
};

/**
 * Get wallet balance in MIST (smallest unit)
 */
export const getWalletBalance = async (address: string): Promise<bigint> => {
  try {
    const normalizedAddress = normalizeAddress(address);
    const coins = await oneChainClient.getCoins({
      owner: normalizedAddress,
      coinType: '0x2::one::ONE',
    });
    
    return coins.data.reduce((sum, coin) => {
      const balance = BigInt(coin.balance || 0);
      return sum + balance;
    }, BigInt(0));
  } catch (error) {
    console.error('Failed to get wallet balance:', error);
    return BigInt(0);
  }
};

/**
 * Format MIST to ONE (1 ONE = 10^9 MIST)
 */
export const formatMistToOne = (mist: bigint): string => {
  const ONE_MIST = BigInt('1000000000');
  const ones = mist / ONE_MIST;
  const remainder = mist % ONE_MIST;
  
  if (remainder === BigInt(0)) {
    return ones.toString();
  }
  
  const decimalPart = remainder.toString().padStart(9, '0').replace(/0+$/, '');
  return `${ones}.${decimalPart}`;
};

/**
 * Format ONE to MIST
 */
export const formatOneToMist = (one: string): bigint => {
  const ONE_MIST = BigInt('1000000000');
  const parts = one.split('.');
  
  const ones = BigInt(parts[0]);
  const decimals = parts[1] ? parts[1].padEnd(9, '0') : '0';
  const remainder = BigInt(decimals);
  
  return ones * ONE_MIST + remainder;
};

// Type definitions
declare global {
  interface Window {
    OneChainWallet?: any;
    OneWallet?: any;
    oneWallet?: any;
    onechainWallet?: any;
    cosmostationWallet?: any;
    CosmostationWallet?: any;
  }
}