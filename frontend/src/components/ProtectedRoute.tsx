import React, { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isConnected } = useSelector((state: RootState) => state.auth)

  if (!isConnected) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
