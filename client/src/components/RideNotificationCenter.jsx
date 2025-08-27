import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BellIcon, FilterIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function RideNotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({});
  const [filters, setFilters] = useState({
    category: 'all',
    priority: 'all',
    isRead: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    fetchCategories();
    fetchStats();
    fetchNotifications();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const response = await API.get('/notifications/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await API.get('/notifications/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (filters.category !== 'all') params.category = filters.category;
      if (filters.priority !== 'all') params.priority = filters.priority;
      if (filters.isRead !== 'all') params.isRead = filters.isRead === 'unread';

      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/notifications/${notificationId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId ? { ...notif, isRead: true } : notif
        )
      );
      fetchStats();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const params = {};
      if (filters.category !== 'all') params.category = filters.category;
      
      await axios.patch(`${import.meta.env.VITE_API_URL}/api/notifications/mark-all-read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
      fetchStats();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      fetchStats();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const iconClasses = "w-6 h-6";
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

  const getPriorityBadge = (priority) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[priority] || colors.medium}`}>
        {priority}
      </span>
    );
  };

  const getCategoryBadge = (category) => {
    const colors = {
      ride: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      social: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      matching: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      community: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      personal: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      system: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[category] || colors.system}`}>
        {category}
      </span>
    );
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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      category: 'all',
      priority: 'all',
      isRead: 'all'
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BellIcon className="h-8 w-8 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Center</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <FilterIcon className="h-5 w-5" />
            <span>Filters</span>
          </button>
          {stats.unread > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total || 0}</div>
          <div className="text-sm text-blue-600 dark:text-blue-400">Total</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.unread || 0}</div>
          <div className="text-sm text-red-600 dark:text-red-400">Unread</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.read || 0}</div>
          <div className="text-sm text-green-600 dark:text-green-400">Read</div>
        </div>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.categories?.ride || 0}</div>
          <div className="text-sm text-purple-600 dark:text-purple-400">Ride</div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.categories?.social || 0}</div>
          <div className="text-sm text-orange-600 dark:text-orange-400">Social</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.categories?.matching || 0}</div>
          <div className="text-sm text-yellow-600 dark:text-yellow-400">Matching</div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.name} value={category.name}>
                    {category.displayName} ({category.unreadCount})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.isRead}
                onChange={(e) => handleFilterChange('isRead', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8">
            <BellIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No notifications</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {Object.values(filters).some(f => f !== 'all') 
                ? 'No notifications match your current filters.'
                : 'You\'re all caught up! No new notifications.'
              }
            </p>
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification._id}
              className={`p-6 border rounded-lg transition-colors ${
                !notification.isRead 
                  ? 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20' 
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              } hover:shadow-md`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className={`text-lg font-semibold ${
                          !notification.isRead 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.title}
                        </h3>
                        {getPriorityBadge(notification.priority)}
                        {getCategoryBadge(notification.category)}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {notification.message}
                      </p>
                      {notification.data && Object.keys(notification.data).length > 0 && (
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-3">
                          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Additional Data:
                          </h4>
                          <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                            {JSON.stringify(notification.data, null, 2)}
                          </pre>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatTime(notification.createdAt)}
                          </span>
                          {notification.expiresAt && (
                            <span className="text-sm text-orange-600 dark:text-orange-400">
                              Expires: {formatTime(notification.expiresAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification._id)}
                              className="flex items-center space-x-1 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                            >
                              <CheckIcon className="h-4 w-4" />
                              <span className="text-sm">Mark Read</span>
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification._id)}
                            className="flex items-center space-x-1 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                          >
                            <TrashIcon className="h-4 w-4" />
                            <span className="text-sm">Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
