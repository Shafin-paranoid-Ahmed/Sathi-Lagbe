// client/src/components/ClassroomAvailability.jsx - Enhanced Classroom Availability System
import React, { useState, useEffect } from 'react';
import { 
  AcademicCapIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  FunnelIcon,
  ChartBarIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UsersIcon,
  CogIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { 
  getFilteredClassrooms, 
  getAvailabilityForTimeslot, 
  getClassroomStats,
  bulkUpdateTimetables 
} from '../api/classrooms';

export default function ClassroomAvailability() {
  const [classrooms, setClassrooms] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    building: '',
    floor: '',
    roomType: '',
    facilities: ''
  });

  // Time-based availability states
  const [selectedDay, setSelectedDay] = useState('monday');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('08:00 AM-09:20 AM');
  const [availabilityData, setAvailabilityData] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');

  // Sample data structure based on your MongoDB collection
  const timeSlots = [
    '08:00 AM-09:20 AM',
    '09:30 AM-10:50 AM',
    '11:00 AM-12:20 PM',
    '12:30 PM-01:50 PM',
    '02:00 PM-03:20 PM',
    '03:30 PM-04:50 PM',
    '05:00 PM-06:20 PM'
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

  // Mock data based on your MongoDB structure - Single Building Campus
  const mockAvailabilityData = [
    {
      _id: '68248214551ebbded4bcd349',
      'Time/Day': '08:00 AM-09:20 AM',
      sunday: '07A-17C, 09A-30C, 09A-37C, 10A-17C, 10A-21C, 10A-37C, 12A-08C, 12A-11C',
      monday: '07A-16C, 07A-17C, 07A-28C, 08A-04C, 09A-14C, 09A-37C, 10A-21C, 10A-29C',
      tuesday: '07A-17C, 09A-30C, 09A-37C, 10A-17C, 10A-21C, 10A-37C, 12A-08C, 12A-11C',
      wednesday: '07A-16C, 07A-17C, 07A-28C, 08A-04C, 09A-14C, 09A-37C, 10A-21C, 10A-29C',
      thursday: '07A-01C, 07A-02C, 07A-03C, 07A-04C, 07A-05C, 07A-07C, 07A-08C, 07A-10C',
      friday: '',
      saturday: '07A-01C, 07A-02C, 07A-03C, 07A-04C, 07A-05C, 07A-07C, 07A-08C, 07A-10C'
    },
    {
      _id: '68248214551ebbded4bcd350',
      'Time/Day': '09:30 AM-10:50 AM',
      sunday: '08A-01C, 08A-02C, 08A-03C, 08A-04C, 08A-05C, 08A-07C, 08A-08C, 08A-10C',
      monday: '08A-16C, 08A-17C, 08A-28C, 09A-04C, 09A-14C, 09A-37C, 10A-21C, 10A-29C',
      tuesday: '08A-01C, 08A-02C, 08A-03C, 08A-04C, 08A-05C, 08A-07C, 08A-08C, 08A-10C',
      wednesday: '08A-16C, 08A-17C, 08A-28C, 09A-04C, 09A-14C, 09A-37C, 10A-21C, 10A-29C',
      thursday: '09A-01C, 09A-02C, 09A-03C, 09A-04C, 09A-05C, 09A-07C, 09A-08C, 09A-10C',
      friday: '',
      saturday: '09A-01C, 09A-02C, 09A-03C, 09A-04C, 09A-05C, 09A-07C, 09A-08C, 09A-10C'
    }
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setClassrooms(mockAvailabilityData);
      setLoading(false);
    }, 1000);
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400';
      case 'occupied':
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-400';
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

  const parseRoomCodes = (roomString) => {
    if (!roomString || roomString === '') return [];
    return roomString.split(', ').map(room => room.trim());
  };

  const getRoomInfo = (roomCode) => {
    // Parse room code format: XXY-ZZC (e.g., 07A-17C) - Single Building Campus
    const match = roomCode.match(/^(\d{2})([A-Z])-(\d{2})([A-Z])$/);
    if (match) {
      const [, floor, wing, room, type] = match;
      return {
        floor: parseInt(floor),
        wing: 'A', // All rooms are in Building A
        room: parseInt(room),
        type,
        fullCode: roomCode
      };
    }
    return { fullCode: roomCode };
  };

  const filterRoomsByBuilding = (rooms, building) => {
    if (!building) return rooms;
    return rooms.filter(room => {
      const roomInfo = getRoomInfo(room);
      return roomInfo.wing === building;
    });
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
            <div className="text-2xl font-bold">{classrooms.length}</div>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {classrooms.reduce((total, slot) => {
                  const availableRooms = parseRoomCodes(slot[selectedDay]).length;
                  return total + availableRooms;
                }, 0)}
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
              <p className="text-2xl font-bold text-gray-900 dark:text-white">1</p>
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
              <p className="text-2xl font-bold text-gray-900 dark:text-white">150+</p>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <option value="A">Main Building</option>
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
                <option value="7">7th Floor</option>
                <option value="8">8th Floor</option>
                <option value="9">9th Floor</option>
                <option value="10">10th Floor</option>
                <option value="12">12th Floor</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Day
              </label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {days.map(day => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time Slot
              </label>
              <select
                value={selectedTimeSlot}
                onChange={(e) => setSelectedTimeSlot(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {timeSlots.map(slot => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Schedule View */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            📅 Weekly Schedule - {days.find(d => d.value === selectedDay)?.label}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Available classrooms for {selectedTimeSlot}
          </p>
        </div>
        
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
              {classrooms.map((slot, index) => (
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
                    const rooms = parseRoomCodes(slot[day.value]);
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
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            🏢 Available Rooms - {selectedTimeSlot} on {days.find(d => d.value === selectedDay)?.label}
          </h3>
        </div>
        
        <div className="p-6">
          {(() => {
            const selectedSlot = classrooms.find(slot => slot['Time/Day'] === selectedTimeSlot);
            const availableRooms = selectedSlot ? parseRoomCodes(selectedSlot[selectedDay]) : [];
            
            if (availableRooms.length === 0) {
              return (
                <div className="text-center py-8">
                  <XCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No rooms available for this time slot</p>
                </div>
              );
            }

            const filteredRooms = filters.building || filters.floor 
              ? availableRooms.filter(roomCode => {
                  const roomInfo = getRoomInfo(roomCode);
                  if (filters.building && roomInfo.wing !== filters.building) return false;
                  if (filters.floor && roomInfo.floor !== parseInt(filters.floor)) return false;
                  return true;
                })
              : availableRooms;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map((roomCode, index) => {
                  const roomInfo = getRoomInfo(roomCode);
                  return (
                    <div key={index} className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">{roomInfo.wing || '?'}</span>
                          </div>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">{roomCode}</span>
                        </div>
                        <CheckCircleIcon className="h-6 w-6 text-green-500" />
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {roomInfo.floor && (
                          <div className="flex items-center space-x-2">
                            <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600 dark:text-gray-400">
                              Floor {roomInfo.floor}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <MapPinIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">
                            Main Building
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
