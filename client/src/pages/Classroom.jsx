// client/src/pages/Classroom.jsx - Professional Classroom Dashboard
import React, { useState, useEffect } from 'react';
import { AcademicCapIcon, BookmarkIcon, HomeIcon, CheckCircleIcon, XCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import ClassroomAvailability from '../components/ClassroomAvailability';
import { getBookmarkedClassrooms, removeClassroomBookmark } from '../api/users';

const BookmarkedClassrooms = () => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      const response = await getBookmarkedClassrooms();
      if (response.data.success) {
        setBookmarks(response.data.bookmarks);
      }
    } catch (err) {
      console.error('Failed to fetch bookmarks', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async (classroomId) => {
    try {
      await removeClassroomBookmark(classroomId);
      setBookmarks(prev => prev.filter(b => b._id !== classroomId));
    } catch (err) {
      console.error('Failed to remove bookmark', err);
    }
  };

  if (loading) return <p>Loading bookmarks...</p>;

  return (
    <div className="space-y-4">
      {bookmarks.length === 0 ? (
        <p>No bookmarked classrooms yet.</p>
      ) : (
        bookmarks.map(classroom => (
          <div key={classroom._id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow flex items-center justify-between">
            <div>
              <p className="font-bold">{classroom.roomNumber} - {classroom.building}</p>
              <p className="text-sm text-gray-500">Floor: {classroom.floor}, Capacity: {classroom.capacity}</p>
            </div>
            <div className="flex items-center space-x-2">
              {classroom.status === 'Available' ? (
                <span className="flex items-center text-green-500">
                  <CheckCircleIcon className="h-5 w-5 mr-1" /> Available
                </span>
              ) : (
                <span className="flex items-center text-red-500">
                  <XCircleIcon className="h-5 w-5 mr-1" /> Occupied
                </span>
              )}
              <button onClick={() => handleRemoveBookmark(classroom._id)} className="text-red-500 hover:text-red-700">
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default function Classroom() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: HomeIcon },
    { id: 'all', name: 'All Classrooms', icon: AcademicCapIcon },
    { id: 'bookmarks', name: 'Bookmarks', icon: BookmarkIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Classroom Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage and search for available classrooms across campus.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-2">
        <div className="flex space-x-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === 'dashboard' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Welcome to the Classroom System!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Use the tabs above to find all classrooms or view your bookmarked rooms.
            </p>
          </div>
        )}
        {activeTab === 'all' && <ClassroomAvailability />}
        {activeTab === 'bookmarks' && <BookmarkedClassrooms />}
      </div>
    </div>
  );
}
