export {};

interface OneChainWalletAPI {
  requestConnection: () => Promise<{ address: string; publicKey: string }>;
  disconnect: () => Promise<void>;
  getAccount: () => Promise<{ address: string } | null>;
  signAndExecuteTransactionBlock: (args: {
    transactionBlock: string;
    options?: {
      showEvents?: boolean;
      showEffects?: boolean;
      showObjectChanges?: boolean;
    };
  }) => Promise<{ digest: string }>;
}

declare global {
  interface Window {
    OneChainWallet?: OneChainWalletAPI;
  }
}
