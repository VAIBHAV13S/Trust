import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import authReducer from './authSlice'
import matchReducer from './matchSlice'
import lobbyReducer from './lobbySlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    match: matchReducer,
    lobby: lobbyReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector = useSelector.bind(null) as ((selector: (state: RootState) => any) => any)

export default store
