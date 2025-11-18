import axios from 'axios'

const getApiUrl = () => {
  try {
    return (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api'
  } catch {
    return 'http://localhost:3000/api'
  }
}

export const apiClient = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default apiClient
