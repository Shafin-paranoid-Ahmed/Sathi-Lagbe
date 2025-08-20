import React, { useState, useEffect } from 'react';
import { Bell, X, MessageCircle, AlertTriangle, MapPin, Car, Clock, CheckCircle, Flag } from 'lucide-react';
import socketService from '../services/socketService';
import { API } from '../api/auth';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    
    // Listen for new notifications
    socketService.onNewNotification((notification) => {
      console.log('=== CLIENT RECEIVED NOTIFICATION ===');
      console.log('Notification:', notification);
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      socketService.off('new_notification');
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await API.get('/notifications');
      const list = (response.data || []).map(n => ({
        id: n.id || n._id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data,
        isRead: n.isRead,
        createdAt: n.createdAt
      }));
      setNotifications(list);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await API.get('/notifications/unread-count');
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await API.patch(`/notifications/${notificationId}/read`);
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // If it's a status change notification, open chat with the user
    if (notification.type === 'status_change' && notification.data?.userId) {
      // Navigate to chat with the user
      window.location.href = `/chat/${notification.data.userId}`;
    }
    
    // If it's an SOS notification, and it has coordinates, open Google Maps
    if (notification.type === 'sos') {
      const coords = notification.data?.coordinates;
      if (coords?.latitude && coords?.longitude) {
        const url = `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`;
        window.open(url, '_blank');
      }
    }
    
    // Handle ride notifications
    if (['ride_invitation', 'ride_cancellation', 'eta_change', 'ride_confirmation', 'ride_completion'].includes(notification.type)) {
      if (notification.data?.rideId) {
        // Navigate to ride details or rides page
        window.location.href = `/rides`;
      }
    }
    
    setIsOpen(false);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-2">
            {loading ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 border-b border-gray-100 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {notification.type === 'status_change' && (
                        <MessageCircle className="w-5 h-5 text-blue-500" />
                      )}
                      {notification.type === 'sos' && (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      )}
                      {notification.type === 'ride_invitation' && (
                        <Car className="w-5 h-5 text-blue-500" />
                      )}
                      {notification.type === 'ride_cancellation' && (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                      {notification.type === 'eta_change' && (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      )}
                      {notification.type === 'ride_confirmation' && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      {notification.type === 'ride_completion' && (
                        <Flag className="w-5 h-5 text-purple-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      {notification.type === 'sos' && notification.data?.coordinates && (
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span>
                            {notification.data.coordinates.latitude}, {notification.data.coordinates.longitude}
                          </span>
                          <a
                            href={`https://www.google.com/maps?q=${notification.data.coordinates.latitude},${notification.data.coordinates.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 dark:text-blue-400 underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View map
                          </a>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
