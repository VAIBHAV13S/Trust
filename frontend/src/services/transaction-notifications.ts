export type TxNotificationStatus = 'pending' | 'success' | 'error';

export interface TxNotification {
  status: TxNotificationStatus;
  message: string;
  digest?: string;
  timestamp: number;
}

export type TxNotificationListener = (notification: TxNotification) => void;

const listeners = new Set<TxNotificationListener>();

export const subscribeToTxNotifications = (listener: TxNotificationListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const notifyTxStatus = (
  status: TxNotificationStatus,
  message: string,
  digest?: string
) => {
  const notification: TxNotification = {
    status,
    message,
    digest,
    timestamp: Date.now(),
  };

  listeners.forEach((listener) => listener(notification));
};
