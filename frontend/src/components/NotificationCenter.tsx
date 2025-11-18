import { useEffect, useState } from 'react'
import { subscribeToTxNotifications, TxNotification } from '@/services/transaction-notifications'

const STATUS_STYLES: Record<TxNotification['status'], string> = {
  pending: 'bg-slate-800 border-slate-600 text-slate-200',
  success: 'bg-green-600/90 border-green-200 text-white',
  error: 'bg-red-600/90 border-red-200 text-white',
}

const AUTO_DISMISS_MS = 6000

export const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<TxNotification[]>([])

  useEffect(() => {
    const unsubscribe = subscribeToTxNotifications((notification) => {
      setNotifications((prev) => [...prev, notification])
      setTimeout(() => {
        setNotifications((prev) => prev.filter((item) => item.timestamp !== notification.timestamp))
      }, AUTO_DISMISS_MS)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  if (notifications.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 w-80">
      {notifications.map((notification) => (
        <div
          key={notification.timestamp}
          className={`border rounded-lg shadow-lg px-4 py-3 transition-all ${STATUS_STYLES[notification.status]}`}
        >
          <div className="font-semibold capitalize">{notification.status}</div>
          <div className="text-sm break-words">{notification.message}</div>
          {notification.digest && (
            <div className="text-xs mt-1 opacity-80 font-mono">
              {notification.digest.slice(0, 12)}...
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default NotificationCenter
