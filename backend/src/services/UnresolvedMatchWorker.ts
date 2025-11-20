import Match from '../models/Match.js'
import { resolveMatchFromChainByMatchId } from './OnChainMatchResolver.js'

const ENABLE_MATCH_INDEXER = process.env.ENABLE_MATCH_INDEXER === 'true'
const MATCH_INDEXER_INTERVAL_MS = Number(process.env.MATCH_INDEXER_INTERVAL_MS || 15000)

export function startUnresolvedMatchWorker() {
  if (!ENABLE_MATCH_INDEXER) {
    return
  }

  console.log('[MatchIndexer] Starting unresolved match worker', {
    intervalMs: MATCH_INDEXER_INTERVAL_MS,
  })

  const run = async () => {
    try {
      const candidates = await Match.find({
        status: { $ne: 'resolved' },
        onChainMatchId: { $exists: true, $ne: null },
      })
        .sort({ createdAt: 1 })
        .limit(10)

      if (!candidates.length) {
        return
      }

      for (const match of candidates) {
        try {
          await resolveMatchFromChainByMatchId(match.matchId)
        } catch (error: any) {
          const message = error?.message || ''
          if (
            message === 'On-chain match is not yet resolved' ||
            message === 'Match must be resolved on-chain; onChainMatchId is missing'
          ) {
            continue
          }

          console.error('[MatchIndexer] Failed to sync match from chain', {
            matchId: match.matchId,
            error: message,
            errorName: error?.name,
            errorStack: error?.stack,
          })
        }
      }
    } catch (err: any) {
      console.error('[MatchIndexer] Worker run failed', {
        error: err?.message || String(err),
        errorName: err?.name,
        errorStack: err?.stack,
        cause: err?.cause,
      })
    }
  }

  // Kick off immediately, then on interval
  run().catch((err) => {
    console.error('[MatchIndexer] Initial run failed', {
      error: err?.message || String(err),
      errorName: (err as any)?.name,
      errorStack: (err as any)?.stack,
      cause: (err as any)?.cause,
    })
  })

  setInterval(() => {
    run().catch((err) => {
      console.error('[MatchIndexer] Interval run failed', {
        error: err?.message || String(err),
        errorName: (err as any)?.name,
        errorStack: (err as any)?.stack,
        cause: (err as any)?.cause,
      })
    })
  }, MATCH_INDEXER_INTERVAL_MS)
}
