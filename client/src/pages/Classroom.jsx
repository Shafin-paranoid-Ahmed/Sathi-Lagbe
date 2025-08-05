import { useEffect, useState } from 'react';
import axios from 'axios';
import { AcademicCapIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function Classroom() {
  const [rooms, setRooms] = useState([]);
  const token = sessionStorage.getItem('token');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:5000/api/classrooms', {
      headers: { Authorization: token }
    })
    .then(res => {
      setRooms(res.data);
      setLoading(false);
    })
    .catch(err => {
      console.error('Error fetching classrooms:', err);
      setLoading(false);
    });
  }, []);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'text-success-600 bg-success-100';
      case 'occupied':
        return 'text-danger-600 bg-danger-100';
      case 'maintenance':
        return 'text-warning-600 bg-warning-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'occupied':
        return <XCircleIcon className="h-5 w-5" />;
      case 'maintenance':
        return <ClockIcon className="h-5 w-5" />;
      default:
        return <ClockIcon className="h-5 w-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Classrooms</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Check the availability of classrooms across campus.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-success-100">
              <CheckCircleIcon className="h-6 w-6 text-success-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {rooms.filter(r => r.status?.toLowerCase() === 'available').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-danger-100">
              <XCircleIcon className="h-6 w-6 text-danger-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Occupied</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {rooms.filter(r => r.status?.toLowerCase() === 'occupied').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-warning-100">
              <ClockIcon className="h-6 w-6 text-warning-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Maintenance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {rooms.filter(r => r.status?.toLowerCase() === 'maintenance').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Classrooms List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          All Classrooms ({rooms.length})
        </h2>
        {rooms.length === 0 ? (
          <div className="text-center py-8">
            <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No classroom data available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(room => (
              <div key={room._id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-primary-500 rounded-full flex items-center justify-center">
                        <AcademicCapIcon className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {room.building} {room.roomNumber}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Room ID: {room._id.slice(-6)}
                      </p>
                    </div>
                  </div>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>
                    {getStatusIcon(room.status)}
                    <span>{room.status || 'Unknown'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
