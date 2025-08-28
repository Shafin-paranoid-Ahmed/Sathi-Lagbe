// client/src/components/ClassroomAvailability.jsx - Enhanced Classroom Availability System
import React, { useState, useEffect, useMemo } from 'react';
import {
  AcademicCapIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FunnelIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UsersIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BookmarkIcon,
  BarsArrowUpIcon
} from '@heroicons/react/24/outline';
import { getFilteredClassrooms } from '../api/classrooms';
import { getFreeClassrooms } from '../api/free';
import {
  getBookmarkedClassrooms,
  addClassroomBookmark,
  removeClassroomBookmark
} from '../api/users';

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
  { value: 'friday', label: 'Friday', short: 'FRI' },
  { value: 'saturday', label: 'Saturday', short: 'SAT' }
];

export default function ClassroomAvailability() {
  const [allClassrooms, setAllClassrooms] = useState([]);
  const [scheduleRows, setScheduleRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedClassrooms, setBookmarkedClassrooms] = useState(new Set());

  const [filters, setFilters] = useState({
    building: '',
    floor: '',
    roomType: '',
    facilities: '',
    capacity: ''
  });
  const [sortBy, setSortBy] = useState('roomNumber');

  // Time-based availability states
  const [selectedDay] = useState('monday');
  const [selectedTimeSlot] = useState('08:00 AM–09:20 AM');
  const [showFilters, setShowFilters] = useState(false);

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

  useEffect(() => {
    fetchBookmarkedClassrooms();
  }, []);

  const fetchBookmarkedClassrooms = async () => {
    try {
      const response = await getBookmarkedClassrooms();
      if (response.data.success) {
        setBookmarkedClassrooms(new Set(response.data.bookmarks.map(b => b._id)));
      }
    } catch (err) {
      console.error('Failed to fetch bookmarks', err);
    }
  };

  const toggleBookmark = async (classroomId) => {
    try {
      if (bookmarkedClassrooms.has(classroomId)) {
        await removeClassroomBookmark(classroomId);
        setBookmarkedClassrooms(prev => {
          const newSet = new Set(prev);
          newSet.delete(classroomId);
          return newSet;
        });
      } else {
        await addClassroomBookmark(classroomId);
        setBookmarkedClassrooms(prev => new Set(prev).add(classroomId));
      }
    } catch (err) {
      console.error('Failed to toggle bookmark', err);
    }
  };


  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const parseRoomCodes = (roomString) => {
    if (!roomString || roomString === '') return [];
    return roomString.split(', ').map(room => room.trim());
  };
  
  const availableRoomDetails = useMemo(() => {
    const selectedSlotData = scheduleRows.find(row => row['Time/Day'] === selectedTimeSlot);
    const availableRoomCodes = selectedSlotData ? parseRoomCodes(selectedSlotData[capitalize(selectedDay)]) : [];
    
    let classrooms = allClassrooms.filter(room => {
      if (!availableRoomCodes.includes(room.roomNumber)) return false;
      if (filters.building && room.building !== filters.building) return false;
      if (filters.floor && room.floor !== parseInt(filters.floor, 10)) return false;
      if (filters.roomType && room.roomType !== filters.roomType) return false;
      if (filters.capacity) {
        const [min, maxStr] = filters.capacity.split('-');
        const max = maxStr === 'Infinity' ? Infinity : Number(maxStr);
        if (room.capacity < Number(min)) return false;
        if (max && room.capacity > max) return false;
      }
      if (filters.facilities) {
        const requiredFacilities = filters.facilities.split(',').map(f => f.trim());
        const hasAllFacilities = requiredFacilities.every(facility => (room.facilities || []).includes(facility));
        if (!hasAllFacilities) return false;
      }
      return true;
    });

    classrooms.sort((a, b) => {
      if (sortBy === 'capacity_asc') {
        return a.capacity - b.capacity;
      }
      if (sortBy === 'capacity_desc') {
        return b.capacity - a.capacity;
      }
      return (a.roomNumber || '').localeCompare(b.roomNumber || '');
    });

    return classrooms;
  }, [allClassrooms, scheduleRows, selectedDay, selectedTimeSlot, filters, sortBy]);

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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Now</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {availableRoomDetails.length}
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

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-purple-600 hover:text-purple-700"
          >
            <FunnelIcon className="h-5 w-5" />
            <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
            {showFilters ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Building
              </label>
              <select
                value={filters.building}
                onChange={(e) => handleFilterChange('building', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Buildings</option>
                {Array.from(new Set(allClassrooms.map(r => r.building))).map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Floor
              </label>
              <select
                value={filters.floor}
                onChange={(e) => handleFilterChange('floor', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Floors</option>
                {Array.from(new Set(allClassrooms.map(r => r.floor))).sort((a, b) => a - b).map(f => <option key={f} value={f}>Floor {f}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Room Type
              </label>
              <select
                value={filters.roomType}
                onChange={(e) => handleFilterChange('roomType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Room Types</option>
                {Array.from(new Set(allClassrooms.map(r => r.roomType))).map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Capacity
              </label>
              <select
                value={filters.capacity}
                onChange={(e) => handleFilterChange('capacity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Any Capacity</option>
                <option value="0-Infinity">0+</option>
                <option value="1-Infinity">1+</option>
                <option value="2-Infinity">2+</option>
                <option value="3-Infinity">3+</option>
                <option value="4-Infinity">4+</option>
                <option value="5-Infinity">5+</option>
                <option value="6-Infinity">6+</option>
                <option value="7-Infinity">7+</option>
                <option value="8-Infinity">8+</option>
                <option value="9-Infinity">9+</option>
                <option value="10-Infinity">10+</option>
                <option value="11-Infinity">11+</option>
                <option value="12-Infinity">12+</option>
                <option value="13-Infinity">13+</option>
                <option value="14-Infinity">14+</option>
                <option value="15-Infinity">15+</option>
                <option value="16-Infinity">16+</option>
                <option value="17-Infinity">17+</option>
                <option value="18-Infinity">18+</option>
                <option value="19-Infinity">19+</option>
                <option value="20-Infinity">20+</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Facilities
              </label>
              <select
                value={filters.facilities}
                onChange={(e) => handleFilterChange('facilities', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Any Facilities</option>
                {Array.from(new Set(allClassrooms.flatMap(r => r.facilities || []))).map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
        )}
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

                    return (
                      <td key={day.value} className="px-6 py-4">
                        {rooms.length > 0 ? (
                          <div className={`p-3 rounded-lg ${isCurrentSlot ? 'bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-700' : 'bg-green-50 dark:bg-green-900/20'}`}>
                            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                              {rooms.length} room{rooms.length !== 1 ? 's' : ''} available
                            </div>
                            <div className="space-y-1">
                              {rooms.slice(0, 3).map((room, roomIndex) => (
                                <div key={roomIndex} className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded border">
                                  {room}
                                </div>
                              ))}
                              {rooms.length > 3 && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  +{rooms.length - 3} more
                                </div>
                              )}
                            </div>
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

      {/* Detailed Room View for Selected Time */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            🏢 Available Rooms - {selectedTimeSlot} on {days.find(d => d.value === selectedDay)?.label}
          </h3>
          <div className="flex items-center space-x-2">
            <BarsArrowUpIcon className="h-5 w-5 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="roomNumber">Sort by Room</option>
              <option value="capacity_asc">Sort by Capacity (Asc)</option>
              <option value="capacity_desc">Sort by Capacity (Desc)</option>
            </select>
          </div>
        </div>
        
        <div className="p-6">
          {(() => {

            if (availableRoomDetails.length === 0) {
              return (
                <div className="text-center py-8">
                  <XCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No rooms available for this time slot with the selected filters.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableRoomDetails.map((room, index) => {
                  return (
                    <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">{room.building || '?'}</span>
                          </div>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">{room.roomNumber}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <CheckCircleIcon className="h-6 w-6 text-green-500" />
                          <button onClick={() => toggleBookmark(room._id)} className="text-gray-400 hover:text-yellow-500">
                            <BookmarkIcon className={`h-6 w-6 ${bookmarkedClassrooms.has(room._id) ? 'text-yellow-500 fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {room.floor && (
                          <div className="flex items-center space-x-2">
                            <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600 dark:text-gray-400">
                              Floor {room.floor}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <MapPinIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {room.building}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {selectedTimeSlot}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
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
