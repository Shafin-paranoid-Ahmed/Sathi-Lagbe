import React, { useState, useEffect } from 'react';
import { FaBell, FaFilter, FaTimes, FaCheck } from 'react-icons/fa';
import RideNotificationCard from './RideNotificationCard';
import axios from 'axios';

const RideNotificationCenter = ({ isOpen, onClose, onNotificationAction }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchRideNotifications();
    }
  }, [isOpen, filter]);

  const fetchRideNotifications = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/notifications', {
        params: {
          type: filter === 'all' ? undefined : filter,
          limit: 50
        }
      });

      // Filter for ride-related notifications
      const rideNotifications = response.data.filter(notification => 
        ['ride_invitation', 'ride_cancellation', 'eta_change', 'ride_confirmation', 'ride_completion'].includes(notification.type)
      );

      setNotifications(rideNotifications);
      setUnreadCount(rideNotifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error('Error fetching ride notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationAction = async (action, rideId, notificationId) => {
    try {
      switch (action) {
        case 'accept':
          await axios.post('/api/rides/confirm', { rideId, userId: 'current' });
          break;
        case 'decline':
          await axios.post('/api/rides/deny', { rideId, userId: 'current' });
          break;
        case 'view':
          // Navigate to ride details
          onNotificationAction('view_ride', rideId);
          break;
        case 'find_alternative':
          // Navigate to ride search
          onNotificationAction('find_alternative', rideId);
          break;
        default:
          break;
      }

      // Mark notification as read
      await markAsRead(notificationId);
      
      // Refresh notifications
      fetchRideNotifications();
    } catch (error) {
      console.error('Error handling notification action:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(`/api/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const dismissNotification = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.patch('/api/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getFilterOptions = () => [
    { value: 'all', label: 'All Notifications' },
    { value: 'ride_invitation', label: 'Ride Invitations' },
    { value: 'ride_cancellation', label: 'Cancellations' },
    { value: 'eta_change', label: 'ETA Updates' },
    { value: 'ride_confirmation', label: 'Confirmations' },
    { value: 'ride_completion', label: 'Completions' }
  ];

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filter);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <FaBell className="text-blue-500" />
            <h2 className="text-lg font-semibold">Ride Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Filter and Actions */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaFilter className="text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {getFilterOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <FaCheck size={12} />
                <span>Mark all as read</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              {error}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FaBell className="mx-auto text-4xl mb-2 text-gray-300" />
              <p>No ride notifications</p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <RideNotificationCard
                key={notification.id}
                notification={notification}
                onAction={(action, rideId) => handleNotificationAction(action, rideId, notification.id)}
                onDismiss={dismissNotification}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={fetchRideNotifications}
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideNotificationCenter;
