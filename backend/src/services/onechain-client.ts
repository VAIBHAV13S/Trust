import { SuiClient } from '@onelabs/sui/client'

const ONE_CHAIN_RPC_URL =
  process.env.ONE_CHAIN_RPC_URL || 'https://rpc-testnet.onelabs.cc:443'

export const oneChainClient = new SuiClient({
  url: ONE_CHAIN_RPC_URL,
})
