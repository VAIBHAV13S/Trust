import React, { createContext, useContext } from 'react'
import { useLobbySocket } from '@/hooks/useLobbySocket'

interface LobbySocketContextValue {
  setReady: (isReady: boolean) => void
}

const noop = () => {}

const LobbySocketContext = createContext<LobbySocketContextValue>({
  setReady: noop,
})

export const LobbySocketProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { setReady } = useLobbySocket()

  return (
    <LobbySocketContext.Provider value={{ setReady }}>
      {children}
    </LobbySocketContext.Provider>
  )
}

export const useLobbySocketContext = () => useContext(LobbySocketContext)
