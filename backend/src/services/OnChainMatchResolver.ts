import Match from '../models/Match.js'
import Player from '../models/Player.js'
import { oneChainClient } from './onechain-client.js'
import { determineWinner, getChoiceDescription } from './MatchResolutionService.js'

export async function resolveMatchFromChainByMatchId(matchId: string) {
  const match = await Match.findOne({ matchId })
  if (!match) {
    throw new Error('Match not found')
  }

  if (match.status === 'resolved') {
    return match
  }

  if (!match.onChainMatchId) {
    throw new Error('Match must be resolved on-chain; onChainMatchId is missing')
  }

  const onChainId = match.onChainMatchId
  let object: any

  try {
    object = await oneChainClient.getObject({
      id: onChainId,
      options: {
        showContent: true,
      },
    })
  } catch (error: any) {
    console.error('[OnChainMatchResolver] Failed to fetch on-chain object', {
      matchId,
      onChainId,
      errorName: error?.name,
      errorMessage: error?.message,
      errorStack: error?.stack,
      cause: error?.cause,
    })
    throw error
  }

  const fields = (object as any)?.data?.content?.fields as any
  if (!fields) {
    console.error('[OnChainMatchResolver] Missing fields in on-chain match object', {
      matchId,
      onChainId,
      raw: object,
    })
    throw new Error('Failed to read on-chain match state')
  }

  if (!fields.resolved) {
    throw new Error('On-chain match is not yet resolved')
  }

  const onChainPlayer1Choice = Number(fields.player1_choice ?? 2)
  const onChainPlayer2Choice = Number(fields.player2_choice ?? 2)

  const player1Tokens = Number(fields.player1_reward ?? 0)
  const player2Tokens = Number(fields.player2_reward ?? 0)

  const p1RepDelta = Number(fields.player1_rep_delta ?? 0)
  const p2RepDelta = Number(fields.player2_rep_delta ?? 0)
  const p1RepPositive = !!fields.player1_rep_positive
  const p2RepPositive = !!fields.player2_rep_positive

  const player1RepChange = p1RepPositive ? p1RepDelta : -p1RepDelta
  const player2RepChange = p2RepPositive ? p2RepDelta : -p2RepDelta

  const winner = determineWinner(player1Tokens, player2Tokens)

  match.player1Choice = onChainPlayer1Choice
  match.player2Choice = onChainPlayer2Choice
  match.player1TokensEarned = player1Tokens
  match.player2TokensEarned = player2Tokens
  match.player1ReputationChange = player1RepChange
  match.player2ReputationChange = player2RepChange
  match.winner = winner
  match.status = 'resolved'
  match.resolvedAt = new Date()
  match.description = 'Resolved from on-chain state'

  await match.save()

  await Promise.all([
    Player.findOneAndUpdate(
      { walletAddress: match.player1Address },
      {
        $inc: {
          tokensAvailable: player1Tokens,
          reputation: player1RepChange,
          matchesPlayed: 1,
          matchesWon: winner === 'player1' ? 1 : 0,
        },
      },
      { new: true }
    ),
    Player.findOneAndUpdate(
      { walletAddress: match.player2Address },
      {
        $inc: {
          tokensAvailable: player2Tokens,
          reputation: player2RepChange,
          matchesPlayed: 1,
          matchesWon: winner === 'player2' ? 1 : 0,
        },
      },
      { new: true }
    ),
  ])

  return match
}
