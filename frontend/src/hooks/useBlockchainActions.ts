import { useCallback } from 'react'
import { Transaction } from '@onelabs/sui/transactions'
import {
  createStakeTokensTx,
  createCommitChoiceTx,
  createRevealChoiceTx,
  createClaimWinningsTx,
  createMatchTx,
} from '@/services/game-contract'
import { oneChainClient, waitForTransaction, isTransactionSuccessful } from '@/services/onechain-client'
import { resolveProvider } from '@/utils/web3'
import { notifyTxStatus } from '@/services/transaction-notifications'

const buildAndExecuteTx = async (tx: Transaction, description: string) => {
  const provider = resolveProvider()
  if (!provider?.signAndExecuteTransactionBlock) {
    throw new Error('OneChain Wallet not available or unsupported version')
  }

  notifyTxStatus('pending', `${description} submitted...`)

  try {
    // Sui/OneChain transactions require a sender address when building
    const sender = localStorage.getItem('walletAddress')
    console.log('🔎 Using sender for tx:', sender)
    const balance = await oneChainClient.getBalance({ owner: sender! })
    console.log('🔎 On-chain gas balance (SUI/OCT) for sender:', balance)
    if (!sender) {
      throw new Error('Missing wallet address for transaction sender. Please reconnect your wallet.')
    }

    tx.setSender(sender)

    const response = await provider.signAndExecuteTransactionBlock({
      // OneChain wallet expects a Transaction instance, not pre-built bytes
      transactionBlock: tx,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    })

    const digest = response.digest
    if (digest) {
      const confirmed = await waitForTransaction(digest, 20, 1500)
      if (confirmed && isTransactionSuccessful(confirmed)) {
        notifyTxStatus('success', `${description} confirmed`, digest)
      } else {
        notifyTxStatus('error', `${description} failed to confirm`, digest)
      }
    }

    return response
  } catch (error) {
    console.error(`${description} failed:`, error)
    notifyTxStatus('error', `${description} failed`)
    throw error
  }
}

export const useBlockchainActions = () => {
  const createOnChainMatch = useCallback(async (opponent: string, stakeAmount: bigint) => {
    const tx = createMatchTx(opponent, stakeAmount)
    const response: any = await buildAndExecuteTx(tx, 'Create on-chain match')

    const objectChanges = response?.objectChanges ?? []
    const created = objectChanges.find(
      (change: any) =>
        change.type === 'created' &&
        typeof change.objectType === 'string' &&
        change.objectType.includes('::game_manager::Match')
    )

    if (!created || !created.objectId) {
      throw new Error('Failed to find on-chain match object id in transaction response')
    }

    return created.objectId as string
  }, [])

  const stakeTokens = useCallback(async (matchId: string, amount: bigint) => {
    const tx = createStakeTokensTx(matchId, amount)
    return buildAndExecuteTx(tx, 'Stake tokens')
  }, [])

  const commitChoice = useCallback(async (matchId: string, choiceHash: string) => {
    const tx = createCommitChoiceTx(matchId, choiceHash)
    return buildAndExecuteTx(tx, 'Commit choice')
  }, [])

  const revealChoice = useCallback(async (matchId: string, choice: 0 | 1 | 2, salt: Uint8Array) => {
    const tx = createRevealChoiceTx(matchId, choice, Array.from(salt))
    return buildAndExecuteTx(tx, 'Reveal choice')
  }, [])

  const withdrawWinnings = useCallback(async (matchId: string) => {
    const tx = createClaimWinningsTx(matchId)
    return buildAndExecuteTx(tx, 'Withdraw winnings')
  }, [])

  return {
    createOnChainMatch,
    stakeTokens,
    commitChoice,
    revealChoice,
    withdrawWinnings,
  }
}
