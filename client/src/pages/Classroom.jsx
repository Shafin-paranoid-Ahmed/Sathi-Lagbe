// client/src/pages/Classroom.jsx - Enhanced with Module 3
import { useEffect, useState } from 'react';
import axios from 'axios';
import { AcademicCapIcon, CheckCircleIcon, XCircleIcon, ClockIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { API } from '../api/auth';
import ClassroomAvailability from '../components/ClassroomAvailability';

export default function Classroom() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModule3, setShowModule3] = useState(false);

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const res = await API.get('/classrooms/all');
      setRooms(res.data);
    } catch (err) {
      console.error('Error fetching classrooms:', err);
      setError('Failed to load classrooms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleSetAllAvailable = async () => {
    try {
        await API.put('/classrooms/status/set-all-available');
        fetchClassrooms(); // Refresh the list
    } catch (err) {
        console.error('Error setting all classrooms to available:', err);
        setError('Failed to update classrooms.');
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'text-success-600 bg-success-100';
      case 'occupied':
        return 'text-danger-600 bg-danger-100';
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

  // Show Module 3 if enabled
  if (showModule3) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowModule3(false)}
            className="flex items-center space-x-2 text-primary-600 hover:text-primary-700"
          >
            <AcademicCapIcon className="h-5 w-5" />
            <span>← Back to Basic View</span>
          </button>
        </div>
        <ClassroomAvailability />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Classrooms</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
            Check the availability of classrooms across campus.
            </p>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={() => setShowModule3(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-md hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
          >
            <SparklesIcon className="h-5 w-5" />
            <span>Welcome Sensei</span>
          </button>
          <button onClick={handleSetAllAvailable} className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600">
              Set All to Available
          </button>
        </div>
      </div>

      {error && <p className="text-red-500">{error}</p>}

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
            <div className="p-3 rounded-full bg-primary-100">
              <AcademicCapIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {rooms.length}
              </p>
            </div>
          </div>
        </div>
      </div>

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
