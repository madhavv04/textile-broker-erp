/**
 * hooks/useNotification.js
 * Toast notification hook — returns notification state and showNotification function.
 */
import { useState, useCallback } from 'react';

export function useNotification(duration = 4000) {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), duration);
  }, [duration]);

  return { notification, showNotification };
}
