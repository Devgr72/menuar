import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export default function AdminNotificationBell({ token }: { token: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    // Connect admin socket
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
      withCredentials: true,
      extraHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    newSocket.on('connect', () => {
      // Typically, an admin would join the admin room via backend authentication,
      // but for simplicity, we listen for admin events.
      newSocket.emit('join_admin_room', { token });
    });

    newSocket.on('admin:commission_earned', (payload) => {
      const newNotif = {
        id: Date.now().toString(),
        title: 'New Commission',
        message: `Partner ${payload.partnerId} earned ₹${payload.amount}.`,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });
    
    newSocket.on('admin:payout_processed', (payload) => {
      const newNotif = {
        id: Date.now().toString(),
        title: 'Payout Processed',
        message: `Payout of ₹${payload.amount} to partner ${payload.partnerId} completed.`,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      setNotifications(prev => [newNotif, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const markAllRead = () => {
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-full transition-colors"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-sm">Admin Alerts</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllRead}
                className="text-xs text-orange-600 font-semibold hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">
                No recent alerts.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(notif => (
                  <div key={notif.id} className={`p-4 hover:bg-gray-50 transition-colors ${!notif.isRead ? 'bg-orange-50/30' : ''}`}>
                    <p className="font-bold text-sm text-gray-900">{notif.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{notif.message}</p>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
