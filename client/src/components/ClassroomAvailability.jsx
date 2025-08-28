// client/src/components/ClassroomAvailability.jsx - Enhanced Classroom Availability System
import React, { useState, useEffect } from 'react';
import {
  XCircleIcon,
  ClockIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import { getFreeClassrooms } from '../api/free';

const capitalize = (str) => {
  if (typeof str !== 'string' || !str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};



const days = [
  { value: 'sunday', label: 'Sunday', short: 'SUN' },
  { value: 'monday', label: 'Monday', short: 'MON' },
  { value: 'tuesday', label: 'Tuesday', short: 'TUE' },
  { value: 'wednesday', label: 'Wednesday', short: 'WED' },
  { value: 'thursday', label: 'Thursday', short: 'THU' },
  { value: 'saturday', label: 'Saturday', short: 'SAT' }
];

export default function ClassroomAvailability() {
  const [scheduleRows, setScheduleRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSlots, setExpandedSlots] = useState(new Set()); // Track which time slots are expanded

  // Time-based availability states
  const [selectedDay] = useState('monday');
  const [selectedTimeSlot] = useState('08:00 AM–09:20 AM');

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const freeRoomsRes = await getFreeClassrooms();
        setScheduleRows(freeRoomsRes.data || []);
      } catch (err) {
        console.error('Failed to load classroom data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);





  const toggleSlotExpansion = (slotKey) => {
    setExpandedSlots(prev => {
          const newSet = new Set(prev);
      if (newSet.has(slotKey)) {
        newSet.delete(slotKey);
      } else {
        newSet.add(slotKey);
      }
      return newSet;
    });
  };



  const parseRoomCodes = (roomString) => {
    if (!roomString || roomString === '') return [];
    return roomString.split(', ').map(room => room.trim());
  };
  


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Classroom Schedule</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Real-time classroom availability and scheduling information.
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Classroom Schedule</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Real-time classroom availability and scheduling information.
        </p>
      </div>



      {/* Main Schedule View */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-soft-2xl">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <AcademicCapIcon className="h-6 w-6 inline-block mr-2 text-purple-500" />
          Weekly Classroom Schedule
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 rounded-lg overflow-hidden shadow-lg">
            <thead className="bg-gradient-to-r from-purple-500 to-indigo-600">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                  Time Slot
                </th>
                {days.map(day => (
                  <th key={day.value} className="px-6 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold text-white">{day.short}</span>
                      <span className="text-xs text-purple-200">{day.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
              {scheduleRows.map((slot) => (
                <tr key={slot._id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 transform hover:scale-[1.01]">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-200 bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-purple-500 mr-2" />
                      <span className="font-medium">
                        {slot['Time/Day']}
                      </span>
                    </div>
                  </td>
                  {days.map(day => {
                    const rooms = parseRoomCodes(slot[capitalize(day.value)]);
                    const isCurrentSlot = slot['Time/Day'] === selectedTimeSlot && day.value === selectedDay;
                    const slotKey = `${slot['Time/Day']}-${day.value}`;
                    const isExpanded = expandedSlots.has(slotKey);

                    return (
                      <td key={day.value} className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">
                        {rooms.length > 0 ? (
                          <div className={`p-3 rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-md ${isCurrentSlot ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-2 border-purple-200 dark:border-purple-700' : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700'}`}>
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center justify-between">
                              <span className="text-green-800 dark:text-green-200 font-semibold">{rooms.length} room{rooms.length !== 1 ? 's' : ''} available</span>
                              {rooms.length > 3 && (
                                <button
                                  onClick={() => toggleSlotExpansion(slotKey)}
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-all duration-200 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                >
                                  {isExpanded ? 'Show less ↑' : `+${rooms.length - 3} more ↓`}
                                </button>
                              )}
                            </div>
                            <div className={`space-y-2 transition-all duration-300 ${isExpanded ? 'max-h-96 overflow-y-auto' : ''}`}>
                              {(isExpanded ? rooms : rooms.slice(0, 3)).map((room, roomIndex) => (
                                <div key={roomIndex} className="bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-between hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 transform hover:scale-[1.02] group shadow-sm hover:shadow-md">
                                  <span className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{room}</span>
                                  <div className="flex items-center space-x-1">
                                    {/* Extract floor info for better display */}
                                    {room.match(/^(\d+)/) && (
                                      <span className="text-xs bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium shadow-sm">
                                        Floor {room.match(/^(\d+)/)[1]}
                                      </span>
                                    )}
                                    {/* Extract zone info */}
                                    {room.match(/^\d+([A-Z])/) && (
                                      <span className="text-xs bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 text-green-700 dark:text-green-300 px-2 py-1 rounded-full font-medium shadow-sm">
                                        Zone {room.match(/^\d+([A-Z])/)[1]}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {isExpanded && rooms.length > 6 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center bg-gray-100 dark:bg-gray-700 py-2 rounded-lg animate-fade-in">
                                📚 Showing all {rooms.length} available rooms
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500 dark:text-gray-400 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg border border-red-200 dark:border-red-700">
                            <XCircleIcon className="h-6 w-6 text-red-400 mx-auto mb-2 animate-pulse" />
                            <span className="text-xs font-medium">No rooms available</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700 transform transition-all duration-300 hover:scale-[1.02]">
          <p className="text-blue-700 dark:text-blue-300 text-sm font-medium flex items-center justify-center">
            🎓 Classroom availability data is updated in real-time
            <span className="ml-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          </p>
        </div>
      </div>
    </div>
  );
}
