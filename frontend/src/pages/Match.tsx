import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppSelector, type RootState } from '../store'
import type { MatchResult } from '../store/matchSlice'
import { CountdownTimer } from '../components/CountdownTimer'
import { ResultAnimation } from '../components/ResultAnimation'
import apiClient from '../utils/api'
import { useBlockchainActions } from '@/hooks/useBlockchainActions'
import { useOnChainData } from '@/hooks/useOnChainData'
import { generateSalt, computeCommitment, bytesToHex } from '@/utils/gameCrypto'

type Choice = 'COOPERATE' | 'BETRAY' | 'ABSTAIN' | null

interface MatchData {
  matchId: string
  onChainMatchId?: string
  player1Address: string
  player1Username: string
  player1Reputation: number
  player2Address: string
  player2Username: string
  player2Reputation: number
  stake: number
  status: string
}

export const Match: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()

  const yourAddress = useAppSelector(
    (state: RootState) => state.auth.player?.walletAddress
  )
  const { createOnChainMatch, stakeTokens, commitChoice, revealChoice, withdrawWinnings } = useBlockchainActions()
  const onChainData = useOnChainData(yourAddress || undefined)

  const [matchData, setMatchData] = useState<MatchData | null>(null)
  const [selectedChoice, setSelectedChoice] = useState<Choice>(null)
  const [timeRemaining, setTimeRemaining] = useState(30)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [stakeAmount, setStakeAmount] = useState('1')
  const [choiceHash, setChoiceHash] = useState('')
  const [revealSalt, setRevealSalt] = useState('')
  const [localResult, setLocalResult] = useState<MatchResult | null>(null)
  const [hasStakedOnChain, setHasStakedOnChain] = useState(false)
  const [onChainMatchId, setOnChainMatchId] = useState<string | null>(null)
  const [onChainAvailable, setOnChainAvailable] = useState(true)
  const [commitSalt, setCommitSalt] = useState<Uint8Array | null>(null)

  const choiceToCode = (choice: Choice): 0 | 1 | 2 => {
    switch (choice) {
      case 'COOPERATE':
        return 0
      case 'BETRAY':
        return 1
      case 'ABSTAIN':
      default:
        return 2
    }
  }

  // Tournament session flow: listen for next-round match-started events even while on the Match page
  useEffect(() => {
    const handleMatchStarted = (event: Event) => {
      const customEvent = event as CustomEvent
      const nextMatchId = customEvent.detail?.matchId
      if (!nextMatchId) return
      navigate(`/match/${nextMatchId}`)
    }

    window.addEventListener('match-started', handleMatchStarted)
    return () => window.removeEventListener('match-started', handleMatchStarted)
  }, [navigate])

  const isYouPlayer1 = matchData?.player1Address === yourAddress
  const opponentData = isYouPlayer1
    ? { address: matchData?.player2Address || '', username: matchData?.player2Username || '', reputation: matchData?.player2Reputation || 0 }
    : { address: matchData?.player1Address || '', username: matchData?.player1Username || '', reputation: matchData?.player1Reputation || 0 }

  const yourData = isYouPlayer1
    ? { address: matchData?.player1Address || '', username: matchData?.player1Username || '', reputation: matchData?.player1Reputation || 0 }
    : { address: matchData?.player2Address || '', username: matchData?.player2Username || '', reputation: matchData?.player2Reputation || 0 }

  // Fetch match data
  useEffect(() => {
    const fetchMatchData = async () => {
      try {
        if (!matchId) return
        const response = await apiClient.get(`/matches/${matchId}`)
        setMatchData(response.data)
        setOnChainMatchId(response.data.onChainMatchId || null)
        if (response.data?.stake != null) {
          setStakeAmount(String(response.data.stake))
        }
        setLoading(false)
      } catch (err) {
        setError('Failed to load match data')
        setLoading(false)
      }
    }

    fetchMatchData()
  }, [matchId])

  // Reset local match state when moving to a new match (e.g. next tournament round)
  useEffect(() => {
    setSelectedChoice(null)
    setTimeRemaining(30)
    setIsSubmitted(false)
    setIsSubmitting(false)
    setError(null)
    setLoading(true)
    setLocalResult(null)
    setHasStakedOnChain(false)
    setOnChainMatchId(null)
    setOnChainAvailable(true)
    setChoiceHash('')
    setRevealSalt('')
    setCommitSalt(null)
  }, [matchId])

  // Ensure there is an on-chain Match object id we can use for staking/commit/reveal
  const ensureOnChainMatchId = async (): Promise<string | null> => {
    if (!onChainAvailable) return null
    if (onChainMatchId) return onChainMatchId
    if (!matchData) return null

    const opponentAddress = matchData.player1Address === yourAddress
      ? matchData.player2Address
      : matchData.player1Address

    try {
      const newOnChainId = await createOnChainMatch(opponentAddress, BigInt(matchData.stake))

      await apiClient.post(`/matches/${matchData.matchId}/onchain`, {
        onChainMatchId: newOnChainId,
      })

      setOnChainMatchId(newOnChainId)
      return newOnChainId
    } catch (err) {
      console.error('Failed to create on-chain match:', err)
      const message = err instanceof Error ? err.message : String(err)

      if (message.includes('No valid gas coins found')) {
        // Off-chain fallback: disable on-chain actions but allow the match to proceed
        setOnChainAvailable(false)
        setError('On-chain actions are unavailable due to missing gas. You can still play this match off-chain.')
      } else {
        setError('Failed to create on-chain match for this match.')
      }

      return null
    }
  }

  const handleStakeTokens = async () => {
    if (!matchId) return
    try {
      const onChainId = await ensureOnChainMatchId()

      if (!onChainId) {
        // Off-chain fallback: keep match playable even without on-chain staking
        setError('On-chain staking is unavailable; continuing match off-chain.')
        return
      }

      await stakeTokens(onChainId, BigInt(stakeAmount))
      setHasStakedOnChain(true)
      setError(null)
    } catch (err) {
      console.error('Stake tokens failed:', err)
      setError('Failed to stake tokens on-chain')
    }
  }

  const handleCommitOnChain = async () => {
    if (!matchId) return
    if (selectedChoice === null) {
      setError('Select a choice before committing on-chain')
      return
    }
    try {
      const onChainId = await ensureOnChainMatchId()
      if (!onChainId) return
      const salt = generateSalt()
      const choiceCode = choiceToCode(selectedChoice)
      const hashBytes = computeCommitment(choiceCode, salt)
      const hashHex = `0x${bytesToHex(hashBytes)}`

      setChoiceHash(hashHex)
      setRevealSalt(bytesToHex(salt))
      setCommitSalt(salt)

      await commitChoice(onChainId, hashHex)
      setError(null)
    } catch (err) {
      console.error('Commit failed:', err)
      setError('Failed to commit choice on-chain')
    }
  }

  const handleRevealOnChain = async () => {
    if (!matchId || selectedChoice === null) {
      setError('Select a choice before revealing on-chain')
      return
    }
    if (!commitSalt) {
      setError('You must commit your choice on-chain before revealing.')
      return
    }
    try {
      const onChainId = await ensureOnChainMatchId()
      if (!onChainId) return
      await revealChoice(
        onChainId,
        selectedChoice === 'COOPERATE' ? 0 : selectedChoice === 'BETRAY' ? 1 : 2,
        commitSalt
      )
    } catch (err) {
      console.error('Reveal failed:', err)
      setError('Failed to reveal choice on-chain')
    }
  }

  const handleWithdraw = async () => {
    if (!matchId) return
    try {
      const onChainId = await ensureOnChainMatchId()
      if (!onChainId) return
      await withdrawWinnings(onChainId)
    } catch (err) {
      console.error('Withdraw failed:', err)
      setError('Failed to withdraw winnings on-chain')
    }
  }

  // Countdown timer
  useEffect(() => {
    if (isSubmitted || !matchData) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto-submit with abstain on timeout (only once)
          clearInterval(timer)
          if (!isSubmitted && (!onChainAvailable || hasStakedOnChain)) {
            handleSubmitChoice('ABSTAIN')
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isSubmitted, matchData, hasStakedOnChain, onChainAvailable])

  const handleSubmitChoice = (choice: Choice) => {
    if (!choice || !matchId) return

    if (onChainAvailable && !hasStakedOnChain) {
      setError('You must stake tokens on-chain before making a choice.')
      return
    }

    // Track local choice while waiting for on-chain resolution
    setSelectedChoice(choice)
    setIsSubmitted(true)
  }

  const handleResolveFromChain = async () => {
    if (!matchId) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await apiClient.post(`/matches/${matchId}/resolve`)
      setLocalResult(response.data as MatchResult)
    } catch (err: any) {
      const backendError = err?.response?.data?.error
      if (backendError) {
        setError(backendError)
      } else {
        setError('Failed to resolve match from on-chain state')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleContinue = () => {
    navigate('/lobby')
  }

  const matchEvents = useMemo(() => {
    if (!onChainData.events?.length) {
      return []
    }
    if (!matchId) {
      return onChainData.events.slice(0, 5)
    }
    return onChainData.events
      .filter((event: any) => {
        const json = event.parsedJson || {}
        return json.matchId === matchId || json.match_id === matchId
      })
      .slice(0, 5)
  }, [onChainData.events, matchId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-slate-300">Loading match...</p>
        </div>
      </div>
    )
  }

  if (error && !localResult) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => navigate('/lobby')}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    )
  }

  // Show result animation when match is resolved
  if (localResult) {
    return <ResultAnimation result={localResult as MatchResult} yourAddress={yourAddress || ''} onContinue={handleContinue} />
  }

  if (!matchData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <p className="text-slate-300">Match data not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 p-4">
      {/* Header with round info */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <p className="text-slate-400 text-sm">ROUND 1 OF 6</p>
            <h1 className="text-3xl font-bold text-white">Match</h1>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm">TIME REMAINING</p>
            <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              <CountdownTimer seconds={timeRemaining} />
            </div>
          </div>
        </div>
      </div>

      {/* Main match area */}
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Your side */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
            <p className="text-slate-400 text-sm uppercase tracking-wider mb-4">YOU</p>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-slate-400 text-xs mb-1">USERNAME</p>
                <p className="text-white font-semibold">{yourData.username}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">ADDRESS</p>
                <p className="text-slate-300 font-mono text-sm">{yourData.address.slice(0, 6)}...{yourData.address.slice(-4)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 rounded p-3">
                  <p className="text-slate-400 text-xs mb-1">Reputation</p>
                  <p className="text-purple-400 font-bold text-lg">{yourData.reputation}</p>
                </div>
                <div className="bg-slate-900 rounded p-3">
                  <p className="text-slate-400 text-xs mb-1">Stake</p>
                  <p className="text-pink-400 font-bold text-lg">{matchData.stake}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Opponent side */}
          <div className="bg-slate-800/50 rounded-lg border border-slate-700 p-6">
            <p className="text-slate-400 text-sm uppercase tracking-wider mb-4">OPPONENT</p>
            <div className="space-y-4 mb-6">
              <div>
                <p className="text-slate-400 text-xs mb-1">USERNAME</p>
                <p className="text-white font-semibold">{opponentData.username}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs mb-1">ADDRESS</p>
                <p className="text-slate-300 font-mono text-sm">{opponentData.address.slice(0, 6)}...{opponentData.address.slice(-4)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 rounded p-3">
                  <p className="text-slate-400 text-xs mb-1">Reputation</p>
                  <p className="text-purple-400 font-bold text-lg">{opponentData.reputation}</p>
                </div>
                <div className="bg-slate-900 rounded p-3">
                  <p className="text-slate-400 text-xs mb-1">Stake</p>
                  <p className="text-pink-400 font-bold text-lg">{matchData.stake}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VS divider */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-slate-700 to-transparent"></div>
          <p className="px-4 text-slate-400 font-semibold text-lg">VS</p>
          <div className="flex-1 h-px bg-gradient-to-l from-slate-700 to-transparent"></div>
        </div>

        {/* Choice buttons */}
        <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg border border-purple-500/20 p-8">
          <p className="text-center text-slate-300 mb-6 text-sm uppercase tracking-wider">
            {isSubmitted
              ? 'Choice submitted! Waiting for opponent...'
              : hasStakedOnChain
              ? 'Choose your action'
              : 'Stake tokens on-chain before choosing your action'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cooperate Button */}
            <button
              onClick={() => {
                setSelectedChoice('COOPERATE')
                handleSubmitChoice('COOPERATE')
              }}
              disabled={isSubmitted || isSubmitting || !hasStakedOnChain}
              className={`p-6 rounded-lg font-semibold text-lg transition-all duration-200 ${
                selectedChoice === 'COOPERATE'
                  ? 'bg-green-600 border-2 border-green-400 text-white shadow-lg shadow-green-500/50'
                  : 'bg-slate-800 border-2 border-slate-700 text-slate-300 hover:border-green-500/50 hover:bg-slate-700'
              } ${isSubmitted || isSubmitting || !hasStakedOnChain ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-3xl mb-2">🤝</div>
              <div>Cooperate</div>
              <div className="text-xs text-slate-400 mt-1">Both get 50 tokens</div>
            </button>

            {/* Betray Button */}
            <button
              onClick={() => {
                setSelectedChoice('BETRAY')
                handleSubmitChoice('BETRAY')
              }}
              disabled={isSubmitted || isSubmitting || !hasStakedOnChain}
              className={`p-6 rounded-lg font-semibold text-lg transition-all duration-200 ${
                selectedChoice === 'BETRAY'
                  ? 'bg-red-600 border-2 border-red-400 text-white shadow-lg shadow-red-500/50'
                  : 'bg-slate-800 border-2 border-slate-700 text-slate-300 hover:border-red-500/50 hover:bg-slate-700'
              } ${isSubmitted || isSubmitting || !hasStakedOnChain ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-3xl mb-2">⚔️</div>
              <div>Betray</div>
              <div className="text-xs text-slate-400 mt-1">You get 100, they get 0</div>
            </button>

            {/* Abstain Button */}
            <button
              onClick={() => {
                setSelectedChoice('ABSTAIN')
                handleSubmitChoice('ABSTAIN')
              }}
              disabled={isSubmitted || isSubmitting || !hasStakedOnChain}
              className={`p-6 rounded-lg font-semibold text-lg transition-all duration-200 ${
                selectedChoice === 'ABSTAIN'
                  ? 'bg-blue-600 border-2 border-blue-400 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-slate-800 border-2 border-slate-700 text-slate-300 hover:border-blue-500/50 hover:bg-slate-700'
              } ${isSubmitted || isSubmitting || !hasStakedOnChain ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-3xl mb-2">🤐</div>
              <div>Abstain</div>
              <div className="text-xs text-slate-400 mt-1">Both get 25 tokens</div>
            </button>
          </div>
        </div>

        {/* Info box */}
        <div className="mt-8 bg-slate-800/50 rounded-lg border border-slate-700 p-4 text-center">
          <p className="text-slate-400 text-sm">
            {timeRemaining > 10 ? (
              <>Your decision will be automatically submitted as <span className="text-blue-400 font-semibold">Abstain</span> if time runs out</>
            ) : (
              <span className="text-red-400 font-semibold">Time running out! Make your choice now!</span>
            )}
          </p>
        </div>

        <div className="mt-4 flex justify-center">
          <button
            onClick={handleResolveFromChain}
            disabled={isSubmitting || !matchId}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Resolving from chain...' : 'Sync Result From Chain'}
          </button>
        </div>

        {/* On-chain summary */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm mb-1">Wallet Balance</p>
            <p className="text-2xl font-semibold text-white">
              {onChainData.loading ? 'Loading…' : onChainData.walletBalance !== null ? `${onChainData.walletBalance.toString()} MIST` : 'N/A'}
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm mb-1">Total Matches</p>
            <p className="text-2xl font-semibold text-white">
              {onChainData.gameState?.total_matches ?? '—'}
            </p>
          </div>
          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm mb-1">Total Players</p>
            <p className="text-2xl font-semibold text-white">
              {onChainData.gameState?.total_players ?? '—'}
            </p>
          </div>
        </div>

        {/* Blockchain actions */}
        <div className="mt-10 bg-slate-900/60 border border-slate-700 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold text-white">On-chain Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Stake Amount (MIST)</label>
              <input
                type="number"
                min="1"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
              />
              <button
                onClick={handleStakeTokens}
                disabled={!matchId}
                className="mt-3 w-full py-2 rounded-lg bg-pink-600 hover:bg-pink-700 disabled:opacity-50"
              >
                Stake Tokens On-chain
              </button>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Commitment Hash (hex)</label>
              <input
                type="text"
                value={choiceHash}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 font-mono"
                placeholder="Auto-computed when you commit"
                readOnly
              />
              <button
                onClick={handleCommitOnChain}
                disabled={!matchId}
                className="mt-3 w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                Commit Choice On-chain
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Reveal Salt</label>
              <input
                type="text"
                value={revealSalt}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
                placeholder="Auto-generated when you commit"
                readOnly
              />
              <button
                onClick={handleRevealOnChain}
                disabled={!matchId}
                className="mt-3 w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                Reveal Choice On-chain
              </button>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Withdraw</label>
              <button
                onClick={handleWithdraw}
                disabled={!matchId}
                className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                Withdraw Winnings
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-slate-900/60 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent On-chain Events</h2>
            <button
              onClick={onChainData.refresh}
              className="text-sm text-slate-400 hover:text-white"
            >
              Refresh
            </button>
          </div>
          {onChainData.loading ? (
            <p className="text-slate-400 text-sm">Loading events…</p>
          ) : matchEvents.length === 0 ? (
            <p className="text-slate-400 text-sm">No recent events for this match.</p>
          ) : (
            <ul className="space-y-3">
              {matchEvents.map((event: any, index: number) => {
                const eventType = event.type?.split('::').pop() || 'Event'
                const json = event.parsedJson || {}
                return (
                  <li key={`${event.id?.txDigest || index}-${index}`} className="bg-slate-800/70 border border-slate-700 rounded-lg p-3">
                    <p className="text-sm text-white font-semibold">{eventType}</p>
                    <p className="text-xs text-slate-400 break-words">
                      {JSON.stringify(json)}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default Match
