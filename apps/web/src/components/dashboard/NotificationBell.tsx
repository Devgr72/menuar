import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCircle2, CircleDollarSign, Store, Clock, RefreshCcw } from 'lucide-react';
import { usePartnerNotifications } from '../../hooks/usePartnerNotifications';
import { PartnerNotification } from '@menuar/types';

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  
  return date.toLocaleDateString();
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'RESTAURANT_ONBOARDED':
      return <Store className="w-5 h-5 text-blue-500" />;
    case 'RESTAURANT_APPROVED':
      return <CheckCircle2 className="w-5 h-5 text-green-500" />;
    case 'COMMISSION_EARNED':
    case 'RENEWAL_COMMISSION':
      return <CircleDollarSign className="w-5 h-5 text-yellow-500" />;
    case 'RESTAURANT_PAYMENT_DUE':
      return <Clock className="w-5 h-5 text-red-500" />;
    case 'PAYOUT_PROCESSED':
      return <CircleDollarSign className="w-5 h-5 text-emerald-500" />;
    default:
      return <Bell className="w-5 h-5 text-gray-500" />;
  }
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead, refetch } = usePartnerNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: PartnerNotification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-dd-navy transition-colors focus:outline-none"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 rounded-full px-1 border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 flex flex-col max-h-[85vh]">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h3 className="font-semibold text-dd-navy">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="text-xs font-medium text-dd-orange hover:text-[#e66000] flex items-center gap-1 transition-colors"
              >
                <Check className="w-3 h-3" /> Mark all as read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 bg-white">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-dd-orange rounded-full animate-spin mb-3"></div>
                <p className="text-sm">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-sm text-red-500 mb-2">Unable to load notifications</p>
                <button onClick={refetch} className="text-xs font-medium text-dd-navy hover:underline flex items-center justify-center gap-1 mx-auto">
                  <RefreshCcw className="w-3 h-3" /> Try again
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-10 text-center text-gray-400 flex flex-col items-center">
                <Bell className="w-10 h-10 mb-3 text-gray-200" />
                <p className="text-sm">No new notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map(notification => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex gap-4 ${
                      !notification.isRead ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className="mt-1 flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-sm ${!notification.isRead ? 'font-semibold text-dd-navy' : 'font-medium text-gray-800'}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-dd-orange mt-1.5 flex-shrink-0"></span>
                        )}
                      </div>
                      <p className={`text-xs leading-relaxed mb-1.5 ${!notification.isRead ? 'text-gray-600' : 'text-gray-500'}`}>
                        {notification.message}
                      </p>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
              <button className="text-xs font-semibold text-dd-navy hover:text-dd-orange transition-colors">
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
