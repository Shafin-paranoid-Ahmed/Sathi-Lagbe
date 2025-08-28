// client/src/pages/Classroom.jsx - Professional Classroom Dashboard
import React, { useState, useEffect } from 'react';
import { AcademicCapIcon, BookmarkIcon, MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import ClassroomAvailability from '../components/ClassroomAvailability';
import { getBookmarkedClassrooms, removeClassroomBookmark } from '../api/users';
import { getFreeClassrooms } from '../api/free';
import FindAvailableClassrooms from '../components/FindAvailableClassrooms';

const BookmarkedClassrooms = () => {
  const [bookmarks, setBookmarks] = useState([]);
  const [scheduleRows, setScheduleRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('monday');

  const timeSlots = [
    '08:00 AM–09:20 AM',
    '09:30 AM–10:50 AM',
    '11:00 AM–12:20 PM',
    '12:30 PM–01:50 PM',
    '02:00 PM–03:20 PM',
    '03:30 PM–04:50 PM',
    '05:00 PM–06:20 PM'
  ];

  const days = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  const capitalize = (str) => {
    if (typeof str !== 'string' || !str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const parseRoomCodes = (roomString) => {
    if (!roomString || roomString === '') return [];
    return roomString.split(', ').map(room => room.trim());
  };

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [bookmarksRes, freeRoomsRes] = await Promise.all([
          getBookmarkedClassrooms(),
          getFreeClassrooms()
        ]);
        
        if (bookmarksRes.data.success) {
          setBookmarks(bookmarksRes.data.bookmarks);
        }
        setScheduleRows(freeRoomsRes.data || []);
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const handleRemoveBookmark = async (classroomId) => {
    try {
      await removeClassroomBookmark(classroomId);
      setBookmarks(prev => prev.filter(b => b._id !== classroomId));
    } catch (err) {
      console.error('Failed to remove bookmark', err);
    }
  };

  const getAvailabilityForRoom = (roomNumber) => {
    const availability = {};
    timeSlots.forEach(timeSlot => {
      const slotData = scheduleRows.find(row => row['Time/Day'] === timeSlot);
      if (slotData) {
        const availableRooms = parseRoomCodes(slotData[capitalize(selectedDay)]);
        availability[timeSlot] = availableRooms.includes(roomNumber);
      } else {
        availability[timeSlot] = false;
      }
    });
    return availability;
  };

  if (loading) return <p>Loading bookmarks...</p>;

  return (
    <div className="space-y-6">
      {/* Day selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Day to Check Availability</h3>
        <div className="flex flex-wrap gap-2">
          {days.map(day => (
            <button
              key={day.value}
              onClick={() => setSelectedDay(day.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedDay === day.value
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookmarked classrooms */}
      <div className="space-y-4">
        {bookmarks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
            <BookmarkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No bookmarked classrooms yet.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Go to "Find Available Classrooms" and bookmark rooms you use frequently.
            </p>
          </div>
        ) : (
          bookmarks.map(classroom => {
            const availability = getAvailabilityForRoom(classroom.roomNumber);
            const availableSlots = Object.entries(availability).filter(([slot, isAvailable]) => isAvailable);
            
            return (
              <div key={classroom._id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      {classroom.roomNumber}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {classroom.building} • Floor {classroom.floor} • Capacity: {classroom.capacity}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleRemoveBookmark(classroom._id)} 
                    className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                    title="Remove bookmark"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Availability for selected day */}
                <div>
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Availability on {days.find(d => d.value === selectedDay)?.label}:
                  </h5>
                  
                  {availableSlots.length === 0 ? (
                    <div className="text-center py-4">
                      <XCircleIcon className="h-8 w-8 text-red-400 mx-auto mb-2" />
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Not available on {days.find(d => d.value === selectedDay)?.label}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {timeSlots.map(timeSlot => {
                        const isAvailable = availability[timeSlot];
                        return (
                          <div
                            key={timeSlot}
                            className={`p-3 rounded-lg border text-center ${
                              isAvailable
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
                                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
                            }`}
                          >
                            <div className="flex items-center justify-center space-x-1">
                              {isAvailable ? (
                                <CheckCircleIcon className="h-4 w-4" />
                              ) : (
                                <XCircleIcon className="h-4 w-4" />
                              )}
                              <span className="text-xs font-medium">
                                {isAvailable ? 'Free' : 'Occupied'}
                              </span>
                            </div>
                            <p className="text-xs mt-1">{timeSlot}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default function Classroom() {
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { id: 'all', name: 'Classroom Schedule', icon: AcademicCapIcon },
    { id: 'find', name: 'Find Available Classrooms', icon: MagnifyingGlassIcon },
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
              className={`flex items-center space-x-2 flex-1 justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
        {activeTab === 'all' && <ClassroomAvailability />}
        {activeTab === 'find' && <FindAvailableClassrooms />}
        {activeTab === 'bookmarks' && <BookmarkedClassrooms />}
      </div>
    </div>
  );
}
