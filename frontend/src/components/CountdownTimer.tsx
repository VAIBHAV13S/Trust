import React, { useState, useEffect } from 'react'

interface CountdownTimerProps {
  seconds: number
  onComplete?: () => void
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ seconds, onComplete }) => {
  const [displaySeconds, setDisplaySeconds] = useState(seconds)

  useEffect(() => {
    setDisplaySeconds(seconds)
  }, [seconds])

  useEffect(() => {
    if (displaySeconds <= 0 && onComplete) {
      onComplete()
    }
  }, [displaySeconds, onComplete])

  const minutes = Math.floor(displaySeconds / 60)
  const secs = displaySeconds % 60

  return (
    <div className="text-center">
      <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
        {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
    </div>
  )
}
