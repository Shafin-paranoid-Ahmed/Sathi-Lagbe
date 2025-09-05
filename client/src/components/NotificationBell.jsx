import React, { useState, useEffect } from 'react';
import { BellIcon, UserIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { API } from '../api/auth';
import { createChat } from '../api/chat';
import socketService from '../services/socketService';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();
  useEffect(() => {
    fetchUnreadCount();
    fetchCategories();

    // --- THIS IS THE CRITICAL FIX for the "4 -> 8" bug ---
    // 1. Define the event handler function with a stable name.
    const handleNewNotification = (notification) => {
      setUnreadCount(prev => prev + 1);
      // To avoid duplicates in the dropdown list, only add if it's not already there
      setNotifications(prev => {
        if (prev.find(n => n._id === notification._id)) {
          return prev;
        }
        return [notification, ...prev];
      });
    };

    // 2. Attach the specific handler to the socket service.
    socketService.onNewNotification(handleNewNotification);

    // 3. Return a cleanup function that REMOVES the specific handler.
    // This is the industry-standard way to prevent duplicate listeners in React.
    return () => {
      socketService.off('new_notification', handleNewNotification);
    };
  }, []);

  const handleNotificationClick = async (notification) => {
    // Mark as read first
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    if (notification.type === 'status_change') {
      try {
        const senderId = notification.sender?._id;
        if (senderId) {
          const res = await createChat([senderId]);
          if (res.data && res.data.data) {
            setShowDropdown(false); // close dropdown
            navigate('/chat', { state: { chat: res.data.data, from: 'status_notification' } });
          }
        }
      } catch (error) {
        // Silently fail
      }
    } else if (notification.type === 'sos') {
      const { latitude, longitude } = notification.data?.coordinates || {};
      if (latitude && longitude) {
        window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
      }
      setShowDropdown(false);
    } else if (notification.data?.rideId) {

        setShowDropdown(false);
        navigate(`/rides/${notification.data.rideId}/manage`);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await API.get('/notifications/unreadcount');
      setUnreadCount(response.data.count);
    } catch (error) {
      // Silently fail
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await API.get('/notifications/categories');
      setCategories(response.data.categories);
    } catch (error) {
      // Silently fail
    }
  };

  const fetchNotifications = async (category = 'all') => {
    setLoading(true);
    try {
      const params = { limit: 20 };
      if (category !== 'all') {
        params.category = category;
      }
      
      const response = await API.get('/notifications', { params });
      setNotifications(response.data);
    } catch (error) {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await API.patch(`/notifications/${notificationId}/read`);
      
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      // Silently fail
    }
  };

  const markAllAsRead = async () => {
    try {
      const params = {};
      if (activeCategory !== 'all') {
        params.category = activeCategory;
      }
      
      await API.patch('/notifications/markallread', {}, { params });
      
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
      setUnreadCount(0);
      
      // Refresh categories to update unread counts
      fetchCategories();
    } catch (error) {
      // Silently fail
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await API.delete(`/notifications/${notificationId}`);
      
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      // Silently fail
    }
  };

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    fetchNotifications(category);
  };

  const getNotificationIcon = (type) => {
    const iconClasses = "w-5 h-5";
    switch (type) {
      case 'ride_request':
      case 'ride_invitation':
      case 'ride_confirmation':
      case 'ride_cancellation':
      case 'ride_completion':
      case 'eta_change':
      case 'route_change':
      case 'capacity_alert':
        return <span className={`${iconClasses} text-blue-500`}>🚗</span>;
      case 'friend_request':
      case 'friend_activity':
      case 'group_ride_suggestion':
      case 'safety_checkin':
        return <span className={`${iconClasses} text-green-500`}>👥</span>;
      case 'status_change':
        return <UserIcon className={`${iconClasses} text-yellow-500`} />;
      case 'better_match_found':
      case 'recurring_ride_alert':
      case 'location_suggestion':
      case 'schedule_conflict':
        return <span className={`${iconClasses} text-purple-500`}>🎯</span>;
      case 'campus_event':
      case 'emergency_alert':
      case 'service_update':
        return <span className={`${iconClasses} text-orange-500`}>📢</span>;
      case 'ride_insights':
      case 'cost_savings':
      case 'environmental_impact':
      case 'achievement_badge':
        return <span className={`${iconClasses} text-yellow-500`}>🏆</span>;
      case 'sos':
        return <span className={`${iconClasses} text-red-500`}>🚨</span>;
      default:
        return <span className={`${iconClasses} text-gray-500`}>📋</span>;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-l-gray-300 bg-gray-50 dark:bg-gray-800';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) {
      return '';
    }
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setShowDropdown(!showDropdown);
          if (!showDropdown) {
            fetchNotifications(activeCategory);
          }
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors transform hover:scale-110 duration-150"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={showDropdown}
        aria-haspopup="true"
        aria-controls="notifications-dropdown"
      >
        <BellIcon className={`h-6 w-6 ${unreadCount > 0 ? 'animate-bounce' : ''}`} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-md" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div 
          id="notifications-dropdown"
          className="absolute right-0 mt-2 w-[420px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 transform origin-top-right animate-fade-in"
          role="dialog"
          aria-labelledby="notifications-title"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 id="notifications-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    aria-label="Mark all notifications as read"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowDropdown(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Close"
                  aria-label="Close notifications"
                >
                  <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`flex-shrink-0 px-3 py-2 text-sm font-medium whitespace-nowrap ${
                activeCategory === 'all'
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              All
            </button>
            {categories.map((category, index) => (
              <button
                key={category.name || `category-${index}`}
                onClick={() => handleCategoryChange(category.name)}
                className={`flex-shrink-0 px-3 py-2 text-sm font-medium relative whitespace-nowrap ${
                  activeCategory === category.name
                    ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {category.displayName}
                {category.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {category.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <button
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(notification);
                    }
                  }}
                  className={`w-full text-left p-4 border-l-4 ${getPriorityColor(notification.priority)} ${
                    !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  } hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset`}
                  aria-label={`${notification.title || 'Notification'}${!notification.isRead ? ', unread' : ''}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${
                          !notification.isRead 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.title}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(notification.createdAt)}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification._id);
                            }}
                            className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                            aria-label="Delete notification"
                            title="Delete notification"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        {!notification.isRead && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification._id);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            aria-label="Mark notification as read"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => window.location.href = '/notifications'}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
