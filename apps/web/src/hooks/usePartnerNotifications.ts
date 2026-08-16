import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { PartnerNotification } from '@menuar/types';
import { 
  getPartnerNotifications, 
  getPartnerUnreadCount, 
  markPartnerNotificationRead, 
  markAllPartnerNotificationsRead 
} from '../api/client';

const API_URL = import.meta.env.VITE_API_URL || '';

export function usePartnerNotifications() {
  const [notifications, setNotifications] = useState<PartnerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [notifsRes, countRes] = await Promise.all([
        getPartnerNotifications(1, 20),
        getPartnerUnreadCount()
      ]);
      setNotifications(notifsRes.data);
      setUnreadCount(countRes.count);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();

    // Initialize socket
    const socketInstance = io(API_URL, {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('Partner socket connected');
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket connect error:', err);
    });

    socketInstance.on('partner:notification', (newNotification: PartnerNotification) => {
      setNotifications((prev) => {
        // Prevent duplicate notifications
        if (prev.some(n => n.id === newNotification.id)) return prev;
        return [newNotification, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Partner socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        socketInstance.connect();
      }
    });
    
    socketInstance.io.on('reconnect', () => {
      // Re-fetch data in case we missed events while disconnected
      fetchInitialData();
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [fetchInitialData]);

  const markAsRead = async (id: string) => {
    // Optimistic UI
    setNotifications((prev) => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markPartnerNotificationRead(id);
    } catch (err) {
      // Rollback on error
      fetchInitialData();
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await markAllPartnerNotificationsRead();
    } catch (err) {
      fetchInitialData();
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refetch: fetchInitialData
  };
}
