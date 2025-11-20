import React from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { RootState } from '@/store'
import ConnectWalletButton from '@/components/ConnectWalletButton'

const Home: React.FC = () => {
  const navigate = useNavigate()
  const { isConnected } = useSelector((state: RootState) => state.auth)

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center relative">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto px-4 relative z-10">
        <div className="mb-6 inline-block animate-float">
          <div className="text-8xl mb-2 filter drop-shadow-[0_0_30px_rgba(0,229,255,0.3)]">💎</div>
        </div>

        <h1 className="text-7xl md:text-9xl font-bold font-display mb-6 tracking-tighter">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-400">TR</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary animate-pulse-glow">UST</span>
        </h1>

        <p className="text-2xl md:text-3xl text-gray-300 mb-8 font-light tracking-wide">
          The Ultimate <span className="text-primary font-semibold">Blockchain</span> Battle Royale
        </p>

        <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          Enter a high-stakes tournament where 50 players compete in a game of deception and strategy.
          Will you cooperate for mutual gain, or betray for personal glory?
        </p>

        <div className="flex flex-col items-center gap-6 mb-16">
          <div className="transform hover:scale-105 transition-transform duration-300">
            <ConnectWalletButton />
          </div>

          {isConnected && (
            <button
              onClick={() => navigate('/lobby')}
              className="btn-primary text-lg px-12 py-4 shadow-[0_0_40px_rgba(0,229,255,0.3)] animate-slide-up"
            >
              ENTER LOBBY
            </button>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="glass-card p-8 transform hover:-translate-y-2 transition-all duration-300">
            <div className="text-4xl mb-4 bg-dark-900/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border border-white/10">⚔️</div>
            <h3 className="text-xl font-bold mb-2 text-white">50-Player Royale</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Survive through multiple rounds of intense 1v1 matchups. Only one champion remains.
            </p>
          </div>

          <div className="glass-card p-8 transform hover:-translate-y-2 transition-all duration-300 delay-100">
            <div className="text-4xl mb-4 bg-dark-900/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border border-white/10">💎</div>
            <h3 className="text-xl font-bold mb-2 text-white">High Stakes</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Stake your tokens and risk it all. The prize pool grows with every elimination.
            </p>
          </div>

          <div className="glass-card p-8 transform hover:-translate-y-2 transition-all duration-300 delay-200">
            <div className="text-4xl mb-4 bg-dark-900/50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto border border-white/10">🔗</div>
            <h3 className="text-xl font-bold mb-2 text-white">Fully On-Chain</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Powered by Move smart contracts on OneChain. Verifiable, transparent, and immutable.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
