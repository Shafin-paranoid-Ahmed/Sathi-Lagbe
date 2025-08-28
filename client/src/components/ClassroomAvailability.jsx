// client/src/components/ClassroomAvailability.jsx - Enhanced Classroom Availability System
import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { getFilteredClassrooms } from '../api/classrooms';
import { getFreeClassrooms } from '../api/free';

const capitalize = (str) => {
  if (typeof str !== 'string' || !str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Moved outside component to prevent re-creation on every render
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
  { value: 'sunday', label: 'Sunday', short: 'SUN' },
  { value: 'monday', label: 'Monday', short: 'MON' },
  { value: 'tuesday', label: 'Tuesday', short: 'TUE' },
  { value: 'wednesday', label: 'Wednesday', short: 'WED' },
  { value: 'thursday', label: 'Thursday', short: 'THU' },
  { value: 'saturday', label: 'Saturday', short: 'SAT' }
];

export default function ClassroomAvailability() {
  const [allClassrooms, setAllClassrooms] = useState([]);
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
        const [freeRoomsRes, roomsRes] = await Promise.all([
          getFreeClassrooms(),
          getFilteredClassrooms({})
        ]);
        setScheduleRows(freeRoomsRes.data || []);
        setAllClassrooms(roomsRes.data.classrooms || []);
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading classroom availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">🏫 Classroom Availability System</h1>
            <p className="text-purple-100">
              Real-time classroom scheduling and availability tracking
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{scheduleRows.length}</div>
            <div className="text-purple-100">Time Slots</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <ClockIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Slots</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{timeSlots.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Slots</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {scheduleRows.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <BuildingOfficeIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Buildings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{ new Set(allClassrooms.map(r => r.building)).size }</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <UsersIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Rooms</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{allClassrooms.length}</p>
            </div>
          </div>
        </div>
      </div>



      {/* Main Schedule View */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Time Slot
                </th>
                {days.map(day => (
                  <th key={day.value} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{day.short}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{day.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {scheduleRows.map((slot, index) => (
                <tr key={slot._id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ClockIcon className="h-5 w-5 text-purple-500 mr-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
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
                      <td key={day.value} className="px-6 py-4">
                        {rooms.length > 0 ? (
                          <div className={`p-3 rounded-lg transition-all duration-300 ${isCurrentSlot ? 'bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-700' : 'bg-green-50 dark:bg-green-900/20'}`}>
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center justify-between">
                              <span>{rooms.length} room{rooms.length !== 1 ? 's' : ''} available</span>
                              {rooms.length > 3 && (
                                <button
                                  onClick={() => toggleSlotExpansion(slotKey)}
                                  className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors text-xs font-medium"
                                >
                                  {isExpanded ? 'Show less' : `+${rooms.length - 3} more`}
                                </button>
                              )}
                            </div>
                            <div className={`space-y-1 transition-all duration-300 ${isExpanded ? 'max-h-96 overflow-y-auto' : ''}`}>
                              {(isExpanded ? rooms : rooms.slice(0, 3)).map((room, roomIndex) => (
                                <div key={roomIndex} className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded border flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                                  <span className="font-medium">{room}</span>
                                  <div className="flex items-center space-x-1">
                                    {/* Extract floor info for better display */}
                                    {room.match(/^(\d+)/) && (
                                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1 rounded">
                                        Floor {room.match(/^(\d+)/)[1]}
                                      </span>
                                    )}
                                    {/* Extract zone info */}
                                    {room.match(/^\d+([A-Z])/) && (
                                      <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1 rounded">
                                        Zone {room.match(/^\d+([A-Z])/)[1]}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {isExpanded && rooms.length > 6 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                                Showing all {rooms.length} rooms
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-3">
                            <XCircleIcon className="h-6 w-6 text-red-400 mx-auto mb-1" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">No rooms</span>
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
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          🎓 Classroom availability data is updated in real-time
        </p>
      </div>
    </div>
  );
}
