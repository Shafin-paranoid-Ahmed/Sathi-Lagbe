import React, { useState, useEffect } from 'react';
import { User, MapPin, Clock, BookOpen, Coffee, Wifi } from 'lucide-react';
import axios from 'axios';

const StatusUpdate = () => {
  const [status, setStatus] = useState('available');
  const [location, setLocation] = useState('');
  const [isAutoUpdate, setIsAutoUpdate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const token = sessionStorage.getItem('token');

  const statusOptions = [
    { value: 'available', label: 'Available', icon: User, color: 'text-green-600' },
    { value: 'busy', label: 'Busy', icon: Clock, color: 'text-red-600' },
    { value: 'in_class', label: 'In Class', icon: BookOpen, color: 'text-blue-600' },
    { value: 'studying', label: 'Studying', icon: BookOpen, color: 'text-purple-600' },
    { value: 'free', label: 'Free', icon: Coffee, color: 'text-orange-600' }
  ];

  useEffect(() => {
    fetchCurrentStatus();
  }, []);

  const fetchCurrentStatus = async () => {
    try {
      const userId = JSON.parse(sessionStorage.getItem('user'))?.id;
      if (!userId) return;

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/users/status/${userId}`,
        { headers: { "Authorization": `Bearer ${token}` } }
      );
      
      const userStatus = response.data.status;
      setCurrentStatus(userStatus);
      setStatus(userStatus.current);
      setLocation(userStatus.location);
      setIsAutoUpdate(userStatus.isAutoUpdate);
    } catch (error) {
      console.error('Error fetching current status:', error);
    }
  };

  const handleStatusUpdate = async () => {
    try {
      setLoading(true);
      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/users/status`,
        {
          status,
          location,
          isAutoUpdate
        },
        { headers: { "Authorization": `Bearer ${token}` } }
      );
      
      setCurrentStatus(response.data.status);
      alert('Status updated successfully!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.error || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (statusValue) => {
    const option = statusOptions.find(opt => opt.value === statusValue);
    return option ? option.icon : User;
  };

  const getStatusColor = (statusValue) => {
    const option = statusOptions.find(opt => opt.value === statusValue);
    return option ? option.color : 'text-gray-600';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-md mx-auto border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
        <User className="w-5 h-5 mr-2" />
        Update Status
      </h2>

      {/* Current Status Display */}
      {currentStatus && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Status:</p>
          <div className="flex items-center">
            {React.createElement(getStatusIcon(currentStatus.current), {
              className: `w-4 h-4 mr-2 ${getStatusColor(currentStatus.current)}`
            })}
            <span className="font-medium capitalize text-gray-900 dark:text-white">
              {currentStatus.current.replace('_', ' ')}
            </span>
            {currentStatus.location && (
              <span className="text-gray-500 dark:text-gray-400 ml-2">
                at {currentStatus.location}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Last updated: {new Date(currentStatus.lastUpdated).toLocaleString()}
          </p>
        </div>
      )}

      {/* Status Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          New Status
        </label>
        <div className="grid grid-cols-2 gap-2">
          {statusOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setStatus(option.value)}
                className={`p-3 rounded-lg border-2 transition-colors flex items-center justify-center ${
                  status === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <IconComponent className={`w-4 h-4 mr-2 ${option.color}`} />
                <span className="text-sm">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Location Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Location (optional)
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Library, Cafeteria, Room 301"
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Auto Update Toggle */}
      <div className="mb-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isAutoUpdate}
            onChange={(e) => setIsAutoUpdate(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
            Enable automatic status updates based on class schedule
          </span>
        </label>
      </div>

      {/* Update Button */}
      <button
        onClick={handleStatusUpdate}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Updating...' : 'Update Status'}
      </button>

      {/* Quick Location Buttons */}
      <div className="mt-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Quick locations:</p>
        <div className="flex flex-wrap gap-2">
          {['Library', 'Cafeteria', 'Gym', 'Study Room', 'Campus'].map((loc) => (
            <button
              key={loc}
              onClick={() => setLocation(loc)}
              className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {loc}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatusUpdate;
