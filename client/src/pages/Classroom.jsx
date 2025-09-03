// client/src/pages/Classroom.jsx - Professional Classroom Dashboard
import React, { useState, useEffect } from 'react';
import { AcademicCapIcon, BookmarkIcon, MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/outline';
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
        
        // Get bookmarked rooms from localStorage
        const bookmarkedRoomCodes = JSON.parse(localStorage.getItem('bookmarkedRooms') || '[]');
        
        // Get free rooms data
        const freeRoomsRes = await getFreeClassrooms();
        setScheduleRows(freeRoomsRes.data || []);
        
        // Create bookmark objects from room codes
        const bookmarkObjects = bookmarkedRoomCodes.map(roomCode => {
          const floor = extractFloorFromRoomCode(roomCode);
          const zone = extractZoneFromRoomCode(roomCode);
          const classroomNumber = extractClassroomNumberFromRoomCode(roomCode);
          
          return {
            _id: roomCode,
            roomNumber: roomCode,
            floor: floor,
            zone: zone,
            classroomNumber: classroomNumber,
            building: 'Main Building',
            capacity: 'Unknown',
            roomType: 'Classroom'
          };
        });
        
        setBookmarks(bookmarkObjects);
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  const extractFloorFromRoomCode = (roomCode) => {
    if (!roomCode) return null;
    const match = roomCode.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const extractZoneFromRoomCode = (roomCode) => {
    if (!roomCode) return null;
    const match = roomCode.match(/^\d+([A-Z])/);
    return match ? match[1] : null;
  };

  const extractClassroomNumberFromRoomCode = (roomCode) => {
    if (!roomCode) return null;
    const match = roomCode.match(/-(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const handleRemoveBookmark = async (roomCode) => {
    try {
      const currentBookmarks = JSON.parse(localStorage.getItem('bookmarkedRooms') || '[]');
      const updatedBookmarks = currentBookmarks.filter(room => room !== roomCode);
      localStorage.setItem('bookmarkedRooms', JSON.stringify(updatedBookmarks));
      setBookmarks(prev => prev.filter(b => b._id !== roomCode));
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bookmarked Classrooms</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track availability of your favorite classrooms.
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bookmarked Classrooms</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Track availability of your favorite classrooms.
        </p>
      </div>

      {/* Day selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-soft-2xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <ClockIcon className="h-6 w-6 inline-block mr-2 text-blue-500" />
          Day Selection
        </h2>
        <div className="flex flex-wrap gap-3">
          {days.map(day => (
            <button
              key={day.value}
              onClick={() => setSelectedDay(day.value)}
              className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-sm hover:shadow-md ${
                selectedDay === day.value
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                  : 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20'
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookmarked classrooms */}
      <div className="space-y-6">
        {bookmarks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-12 text-center transform transition-all duration-300 hover:scale-[1.01] hover:shadow-soft-2xl">
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <BookmarkIcon className="h-12 w-12 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No bookmarked classrooms yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Save your favorite classrooms for quick access to their availability.
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg inline-block">
              💡 Go to "Find Available Classrooms" and click the bookmark icon to save rooms
            </p>
          </div>
        ) : (
          bookmarks.map(classroom => {
            const availability = getAvailabilityForRoom(classroom.roomNumber);
            const availableSlots = Object.entries(availability).filter(([slot, isAvailable]) => isAvailable);
            
            return (
              <div key={classroom._id} className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-soft-2xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                      <BookmarkIcon className="h-6 w-6 text-white fill-current" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                        {classroom.roomNumber}
                      </h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                          {classroom.building}
                        </span>
                        <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded-full font-medium">
                          Floor {classroom.floor}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveBookmark(classroom._id)} 
                    className="text-red-500 hover:text-red-700 p-3 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 transition-all duration-200 transform hover:scale-110"
                    title="Remove bookmark"
                  >
                    <TrashIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Availability for selected day */}
                <div>
                  <h5 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center">
                    <ClockIcon className="h-5 w-5 mr-2 text-blue-500" />
                    Availability on {days.find(d => d.value === selectedDay)?.label}
                  </h5>
                  
                  {availableSlots.length === 0 ? (
                    <div className="text-center py-8 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl border border-red-200 dark:border-red-700">
                      <XCircleIcon className="h-12 w-12 text-red-400 mx-auto mb-3 animate-pulse" />
                      <p className="text-lg font-medium text-red-600 dark:text-red-400 mb-1">
                        Not available
                      </p>
                      <p className="text-sm text-red-500 dark:text-red-400">
                        on {days.find(d => d.value === selectedDay)?.label}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {timeSlots.map(timeSlot => {
                        const isAvailable = availability[timeSlot];
                        return (
                          <div
                            key={timeSlot}
                            className={`p-4 rounded-xl border text-center transform transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md ${
                              isAvailable
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-200'
                                : 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'
                            }`}
                          >
                            <div className="flex items-center justify-center space-x-2 mb-2">
                              {isAvailable ? (
                                <CheckCircleIcon className="h-5 w-5" />
                              ) : (
                                <XCircleIcon className="h-5 w-5" />
                              )}
                              <span className="text-sm font-bold">
                                {isAvailable ? 'Available' : 'Occupied'}
                              </span>
                            </div>
                            <p className="text-xs font-medium">{timeSlot}</p>
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
        <div className="flex space-x-1" role="tablist" aria-label="Classroom navigation">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              id={`${tab.id}-tab`}
              className={`flex items-center space-x-2 flex-1 justify-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon className="h-5 w-5" aria-hidden="true" />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        {activeTab === 'all' && (
          <div role="tabpanel" id="all-panel" aria-labelledby="all-tab">
            <ClassroomAvailability />
          </div>
        )}
        {activeTab === 'find' && (
          <div role="tabpanel" id="find-panel" aria-labelledby="find-tab">
            <FindAvailableClassrooms />
          </div>
        )}
        {activeTab === 'bookmarks' && (
          <div role="tabpanel" id="bookmarks-panel" aria-labelledby="bookmarks-tab">
            <BookmarkedClassrooms />
          </div>
        )}
      </div>
    </div>
  );
}
