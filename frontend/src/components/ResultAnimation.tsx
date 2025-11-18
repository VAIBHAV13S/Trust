import React, { useState, useEffect } from 'react'
import { MatchResult } from '../store/matchSlice'

interface ResultAnimationProps {
  result: MatchResult
  yourAddress: string
  onContinue: () => void
}

const getChoiceEmoji = (choice: string): string => {
  switch (choice.toUpperCase()) {
    case 'COOPERATE':
      return '🤝'
    case 'BETRAY':
      return '⚔️'
    case 'ABSTAIN':
      return '🤐'
    default:
      return '❓'
  }
}

const getWinnerMessage = (winner: string): string => {
  switch (winner) {
    case 'player1':
      return 'You won this round!'
    case 'player2':
      return 'Your opponent won!'
    case 'tie':
      return "It's a tie!"
    default:
      return 'Round complete'
  }
}

export const ResultAnimation: React.FC<ResultAnimationProps> = ({
  result,
  yourAddress,
  onContinue,
}) => {
  const [showChoices, setShowChoices] = useState(false)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    const timer1 = setTimeout(() => setShowChoices(true), 500)
    const timer2 = setTimeout(() => setShowResults(true), 1500)
    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [])

  const isYouPlayer1 = yourAddress === result.player1?.toString() || true // Simplified - should match from props
  const yourResult = isYouPlayer1 ? result.player1 : result.player2
  const opponentResult = isYouPlayer1 ? result.player2 : result.player1
  const youWon = (isYouPlayer1 && result.winner === 'player1') || (!isYouPlayer1 && result.winner === 'player2')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-lg max-w-2xl w-full border border-slate-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 to-pink-900 px-6 py-4 rounded-t-lg">
          <h2 className="text-2xl font-bold text-white">Round Results</h2>
        </div>

        {/* Main Content */}
        <div className="p-8">
          {/* Choices Reveal */}
          <div
            className={`grid grid-cols-2 gap-6 mb-8 transition-all duration-500 ${
              showChoices ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          >
            {/* Your Choice */}
            <div className="text-center">
              <p className="text-slate-400 text-sm mb-2">YOUR CHOICE</p>
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-6xl mb-3">{getChoiceEmoji(yourResult.choice)}</div>
                <p className="text-xl font-bold text-white">{yourResult.choice}</p>
              </div>
            </div>

            {/* Opponent Choice */}
            <div className="text-center">
              <p className="text-slate-400 text-sm mb-2">OPPONENT'S CHOICE</p>
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <div className="text-6xl mb-3">{getChoiceEmoji(opponentResult.choice)}</div>
                <p className="text-xl font-bold text-white">{opponentResult.choice}</p>
              </div>
            </div>
          </div>

          {/* Outcome Message */}
          <div className="text-center mb-8 py-6 border-y border-slate-700">
            <p className="text-slate-400 text-sm uppercase tracking-wider mb-2">Outcome</p>
            <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              {getWinnerMessage(result.winner)}
            </p>
            <p className="text-slate-400 mt-3">{result.description}</p>
          </div>

          {/* Results Display */}
          <div
            className={`grid grid-cols-2 gap-6 mb-8 transition-all duration-500 ${
              showResults ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {/* Your Results */}
            <div className={`p-4 rounded-lg border-2 ${youWon ? 'border-green-500 bg-green-950' : 'border-slate-700 bg-slate-800'}`}>
              <p className="text-slate-400 text-sm mb-3">YOU</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Tokens Earned:</span>
                  <span className={`font-bold ${yourResult.tokensEarned > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {yourResult.tokensEarned > 0 ? '+' : ''}{yourResult.tokensEarned}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Reputation:</span>
                  <span
                    className={`font-bold ${
                      yourResult.reputationChange > 0 ? 'text-green-400' : yourResult.reputationChange < 0 ? 'text-red-400' : 'text-slate-300'
                    }`}
                  >
                    {yourResult.reputationChange > 0 ? '+' : ''}{yourResult.reputationChange}
                  </span>
                </div>
              </div>
            </div>

            {/* Opponent Results */}
            <div className={`p-4 rounded-lg border-2 ${!youWon && result.winner !== 'tie' ? 'border-green-500 bg-green-950' : 'border-slate-700 bg-slate-800'}`}>
              <p className="text-slate-400 text-sm mb-3">OPPONENT</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Tokens Earned:</span>
                  <span className={`font-bold ${opponentResult.tokensEarned > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {opponentResult.tokensEarned > 0 ? '+' : ''}{opponentResult.tokensEarned}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Reputation:</span>
                  <span
                    className={`font-bold ${
                      opponentResult.reputationChange > 0 ? 'text-green-400' : opponentResult.reputationChange < 0 ? 'text-red-400' : 'text-slate-300'
                    }`}
                  >
                    {opponentResult.reputationChange > 0 ? '+' : ''}{opponentResult.reputationChange}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          {showResults && (
            <button
              onClick={onContinue}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all duration-200 animate-pulse"
            >
              Back to Lobby
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
