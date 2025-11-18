import { useDispatch, useSelector } from 'react-redux'
import { RootState, AppDispatch } from '@/store'

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>()
  const auth = useSelector((state: RootState) => state.auth)
  return { ...auth, dispatch }
}
