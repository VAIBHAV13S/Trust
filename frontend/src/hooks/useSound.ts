import { useRef } from 'react'

const DEFAULT_SOUND =
  'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBIAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA='

export const useSound = (src = DEFAULT_SOUND) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  if (!audioRef.current) {
    audioRef.current = new Audio(src)
  }

  return () => {
    const sound = audioRef.current
    if (!sound) return
    sound.currentTime = 0
    sound.play().catch(() => {})
  }
}
