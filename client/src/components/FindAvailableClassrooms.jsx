// client/src/components/FindAvailableClassrooms.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { getFreeClassrooms } from '../api/free';
import { 
    getBookmarkedClassrooms,
    addClassroomBookmark,
    removeClassroomBookmark
} from '../api/users';
import { MagnifyingGlassIcon, MapPinIcon, BuildingOfficeIcon, BookmarkIcon, AcademicCapIcon, ClockIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

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
    { value: 'sunday', label: 'Sunday' },
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'saturday', label: 'Saturday' }
];

const capitalize = (str) => {
    if (typeof str !== 'string' || !str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export default function FindAvailableClassrooms() {
    const [scheduleRows, setScheduleRows] = useState([]);
    const [filters, setFilters] = useState({
        day: '', // Empty means all days
        timeSlot: '', // Empty means all time slots
        floor: ''
    });
    const [availableRooms, setAvailableRooms] = useState([]);
    const [groupedResults, setGroupedResults] = useState({});
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [bookmarkedClassrooms, setBookmarkedClassrooms] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedDays, setExpandedDays] = useState(new Set()); // Track which days are expanded

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const freeRoomsRes = await getFreeClassrooms();
                setScheduleRows(freeRoomsRes.data || []);
            } catch (error) {
                console.error("Failed to load classroom data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
        fetchBookmarkedClassrooms();
    }, []);

    const fetchBookmarkedClassrooms = async () => {
        try {
            // For now, we'll store bookmarks in localStorage since we're only using Free Classroom database
            const bookmarks = JSON.parse(localStorage.getItem('bookmarkedRooms') || '[]');
            setBookmarkedClassrooms(new Set(bookmarks));
        } catch (err) {
            console.error('Failed to fetch bookmarks', err);
        }
    };

    const parseRoomCodes = (roomString) => {
        if (!roomString || roomString === '') return [];
        return roomString.split(', ').map(room => room.trim());
    };

    // Helper function to extract floor from room number like "12A-09C"
    const extractFloorFromRoomCode = (roomCode) => {
        if (!roomCode) return null;
        // Extract the first number from the room code (e.g., "12" from "12A-09C")
        const match = roomCode.match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    };

    // Helper function to extract zone from room number like "12A-09C" 
    const extractZoneFromRoomCode = (roomCode) => {
        if (!roomCode) return null;
        // Extract the letter after the first number (e.g., "A" from "12A-09C")
        const match = roomCode.match(/^\d+([A-Z])/);
        return match ? match[1] : null;
    };

    // Helper function to extract classroom number from room code like "12A-09C"
    const extractClassroomNumberFromRoomCode = (roomCode) => {
        if (!roomCode) return null;
        // Extract the number after the hyphen (e.g., "09" from "12A-09C")
        const match = roomCode.match(/-(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    };

    // Helper function to check if a room matches the search query
    const roomMatchesSearch = (roomCode, query) => {
        if (!query.trim()) return true;
        
        const lowerQuery = query.toLowerCase().trim();
        const lowerRoomCode = roomCode.toLowerCase();
        
        // Direct match (e.g., "12a-09c" matches "12A-09C")
        if (lowerRoomCode.includes(lowerQuery)) {
            return true;
        }
        
        // Floor + Zone match (e.g., "7a" matches "07A-*")
        const floorZoneMatch = lowerQuery.match(/^(\d+)([a-z]?)$/);
        if (floorZoneMatch) {
            const [, searchFloor, searchZone] = floorZoneMatch;
            const roomFloor = extractFloorFromRoomCode(roomCode);
            const roomZone = extractZoneFromRoomCode(roomCode);
            
            const floorMatches = roomFloor === parseInt(searchFloor, 10);
            const zoneMatches = !searchZone || (roomZone && roomZone.toLowerCase() === searchZone);
            
            return floorMatches && zoneMatches;
        }
        
        // Zone only match (e.g., "a" matches "*A-*")
        if (lowerQuery.length === 1 && /^[a-z]$/.test(lowerQuery)) {
            const roomZone = extractZoneFromRoomCode(roomCode);
            return roomZone && roomZone.toLowerCase() === lowerQuery;
        }
        
        // Floor only match (e.g., "7" matches "07*-*")
        if (/^\d+$/.test(lowerQuery)) {
            const roomFloor = extractFloorFromRoomCode(roomCode);
            return roomFloor === parseInt(lowerQuery, 10);
        }
        
        return false;
    };

    const handleSearch = useCallback(() => {
        if (loading) return;
        setSearching(true);
        setSearched(true);
        
        const grouped = {};
        const allRoomsSet = new Set();
        
        // Get days to search (all days if no filter, otherwise specific day)
        const daysToSearch = filters.day ? [filters.day] : days.map(d => d.value);
        
        // Get time slots to search (all slots if no filter, otherwise specific slot)
        const timeSlotsToSearch = filters.timeSlot ? [filters.timeSlot] : timeSlots;
        
        // Iterate through all schedule rows and days
        scheduleRows.forEach(row => {
            const timeSlot = row['Time/Day'];
            
            // Skip if this time slot is not in our filter
            if (!timeSlotsToSearch.includes(timeSlot)) return;
            
            daysToSearch.forEach(dayValue => {
                const dayLabel = days.find(d => d.value === dayValue)?.label || dayValue;
                const availableRoomCodes = parseRoomCodes(row[capitalize(dayValue)]);
                
                // Filter room codes based on criteria
                const filteredRoomCodes = availableRoomCodes.filter(roomCode => {
                    // Floor filtering
                    if (filters.floor) {
                        const roomFloor = extractFloorFromRoomCode(roomCode);
                        if (roomFloor !== parseInt(filters.floor, 10)) {
                            return false;
                        }
                    }
                    
                    // Search query filtering
                    if (!roomMatchesSearch(roomCode, searchQuery)) {
                        return false;
                    }
                    
                    return true;
                });
                
                if (filteredRoomCodes.length > 0) {
                    // Initialize day group if it doesn't exist
                    if (!grouped[dayLabel]) {
                        grouped[dayLabel] = {};
                    }
                    
                    // Create room objects for this time slot
                    const roomObjects = filteredRoomCodes.map(roomCode => {
                        allRoomsSet.add(roomCode); // Track all unique rooms
                        
                        const floor = extractFloorFromRoomCode(roomCode);
                        const zone = extractZoneFromRoomCode(roomCode);
                        const classroomNumber = extractClassroomNumberFromRoomCode(roomCode);
                        
                        return {
                            _id: `${roomCode}-${dayValue}-${timeSlot}`,
                            roomNumber: roomCode,
                            floor: floor,
                            zone: zone,
                            classroomNumber: classroomNumber,
                            building: 'Main Building',
                            capacity: 'Unknown',
                            roomType: 'Classroom',
                            day: dayLabel,
                            timeSlot: timeSlot
                        };
                    });
                    
                    // Sort rooms by room number
                    roomObjects.sort((a, b) => (a.roomNumber || '').localeCompare(b.roomNumber || ''));
                    
                    grouped[dayLabel][timeSlot] = roomObjects;
                }
            });
        });
        
        // Create a flat array of all unique rooms for the count
        const allRoomsArray = Array.from(allRoomsSet).map(roomCode => {
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
        
        setGroupedResults(grouped);
        setAvailableRooms(allRoomsArray);
        setSearching(false);
    }, [scheduleRows, filters, loading, searchQuery, roomMatchesSearch]);

    useEffect(() => {
        // Perform an initial search when the component data has loaded
        if (!loading) {
            handleSearch();
        }
    }, [loading, handleSearch]);

    // Auto-search when search query changes (with debouncing)
    useEffect(() => {
        if (!loading && searched) {
            const debounceTimer = setTimeout(() => {
                handleSearch();
            }, 500); // 500ms debounce

            return () => clearTimeout(debounceTimer);
        }
    }, [searchQuery, loading, searched, handleSearch]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const toggleBookmark = async (roomCode) => {
        try {
            const currentBookmarks = JSON.parse(localStorage.getItem('bookmarkedRooms') || '[]');
            
            if (bookmarkedClassrooms.has(roomCode)) {
                // Remove bookmark
                const updatedBookmarks = currentBookmarks.filter(room => room !== roomCode);
                localStorage.setItem('bookmarkedRooms', JSON.stringify(updatedBookmarks));
                setBookmarkedClassrooms(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(roomCode);
                    return newSet;
                });
            } else {
                // Add bookmark
                const updatedBookmarks = [...currentBookmarks, roomCode];
                localStorage.setItem('bookmarkedRooms', JSON.stringify(updatedBookmarks));
                setBookmarkedClassrooms(prev => new Set(prev).add(roomCode));
            }
        } catch (err) {
            console.error('Failed to toggle bookmark', err);
        }
    };

    // Helper function to highlight search matches in room numbers
    const highlightSearchMatch = (roomNumber, query) => {
        if (!query.trim()) return roomNumber;
        
        const lowerQuery = query.toLowerCase().trim();
        const lowerRoomNumber = roomNumber.toLowerCase();
        
        // Check for direct substring match
        if (lowerRoomNumber.includes(lowerQuery)) {
            const startIndex = lowerRoomNumber.indexOf(lowerQuery);
            const endIndex = startIndex + lowerQuery.length;
            
            return (
                <>
                    {roomNumber.substring(0, startIndex)}
                    <span className="bg-yellow-200 dark:bg-yellow-600 px-1 rounded font-bold text-yellow-900 dark:text-yellow-100">
                        {roomNumber.substring(startIndex, endIndex)}
                    </span>
                    {roomNumber.substring(endIndex)}
                </>
            );
        }
        
        return roomNumber;
    };

    // Function to toggle day expansion
    const toggleDayExpansion = (dayLabel) => {
        setExpandedDays(prev => {
            const newSet = new Set(prev);
            if (newSet.has(dayLabel)) {
                newSet.delete(dayLabel);
            } else {
                newSet.add(dayLabel);
            }
            return newSet;
        });
    };

    // Function to get total rooms count for a day
    const getTotalRoomsForDay = (timeSlots) => {
        const uniqueRooms = new Set();
        Object.values(timeSlots).forEach(rooms => {
            rooms.forEach(room => uniqueRooms.add(room.roomNumber));
        });
        return uniqueRooms.size;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Find Available Classrooms</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Search and filter classrooms by day, time, and floor.
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Find Available Classrooms</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Search and filter classrooms by day, time, and floor.
                </p>
            </div>

            {/* Search Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-soft-2xl">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <MagnifyingGlassIcon className="h-6 w-6 inline-block mr-2 text-blue-500" />
                    Search Filters
                </h2>
                {/* Primary Search bar */}
                <div className="mb-6">
                    <label className="block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        🔍 Search Classrooms
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by room code (e.g., '7a', '12A-09', '07B-15C') or leave empty to see all..."
                            className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md"
                        />
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                    </div>
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <span className="font-medium">💡 Search tips:</span> 
                        <span className="ml-1">Type "7a" for 7th floor A zone, "12" for all 12th floor rooms, "a" for all A zone rooms, or leave empty to see all available classrooms</span>
                    </div>
                </div>

                {/* Secondary Filters */}
                <details className="mb-4">
                    <summary className="cursor-pointer p-3 bg-gray-50 dark:bg-gray-700 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        🎛️ Additional Filters (Optional)
                    </summary>
                    <div className="mt-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Day filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Day</label>
                                <select name="day" value={filters.day} onChange={handleFilterChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                    <option value="">All Days</option>
                                    {days.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                </select>
                            </div>

                            {/* Time slot filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Time Slot</label>
                                <select name="timeSlot" value={filters.timeSlot} onChange={handleFilterChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                                    <option value="">All Time Slots</option>
                                    {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            {/* Floor filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Floor</label>
                                <input type="number" name="floor" value={filters.floor} onChange={handleFilterChange} placeholder="e.g., 7" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                        </div>
                        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                            These filters work together with your search query to narrow down results
                        </div>
                    </div>
                </details>
            </div>

            {/* Results */}
            {searched && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-soft-2xl">
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                            <AcademicCapIcon className="h-6 w-6 inline-block mr-2 text-green-500" />
                            Search Results ({availableRooms.length} unique room{availableRooms.length !== 1 ? 's' : ''} found)
                        </h2>
                        <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {searchQuery && (
                                <span className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                                    <span className="font-medium">Search:</span> "{searchQuery}"
                                </span>
                            )}
                            {filters.day && (
                                <span className="bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full">
                                    <span className="font-medium">Day:</span> {days.find(d => d.value === filters.day)?.label}
                                </span>
                            )}
                            {filters.timeSlot && (
                                <span className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
                                    <span className="font-medium">Time:</span> {filters.timeSlot}
                                </span>
                            )}
                            {filters.floor && (
                                <span className="bg-orange-100 dark:bg-orange-900/30 px-3 py-1 rounded-full">
                                    <span className="font-medium">Floor:</span> {filters.floor}
                                </span>
                            )}
                        </div>
                    </div>

                    {Object.keys(groupedResults).length > 0 ? (
                        <div className="space-y-4">
                            {Object.entries(groupedResults).map(([dayLabel, timeSlots]) => {
                                const isExpanded = expandedDays.has(dayLabel);
                                const totalRooms = getTotalRoomsForDay(timeSlots);
                                const totalTimeSlots = Object.keys(timeSlots).length;
                                
                                return (
                                    <div key={dayLabel} className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                                        {/* Day Header - Clickable */}
                                        <button
                                            onClick={() => toggleDayExpansion(dayLabel)}
                                            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 p-4 text-left transition-all duration-200"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <span className="text-2xl">📅</span>
                                                    <div>
                                                        <h3 className="text-xl font-bold text-white">
                                                            {dayLabel}
                                                        </h3>
                                                        <p className="text-sm text-purple-100">
                                                            {totalRooms} unique room{totalRooms !== 1 ? 's' : ''} • {totalTimeSlots} time slot{totalTimeSlots !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-sm text-purple-200 hidden sm:inline">
                                                        {isExpanded ? 'Click to collapse' : 'Click to expand'}
                                                    </span>
                                                    {isExpanded ? (
                                                        <ChevronUpIcon className="h-6 w-6 text-white transform transition-transform duration-200" />
                                                    ) : (
                                                        <ChevronDownIcon className="h-6 w-6 text-white transform transition-transform duration-200" />
                                                    )}
                                                </div>
                                            </div>
                                        </button>

                                        {/* Collapsible Content */}
                                        <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-none opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                            <div className="p-4 space-y-6">
                                                {Object.entries(timeSlots).map(([timeSlot, rooms]) => (
                                                    <div key={timeSlot} className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
                                                        <div className="bg-gray-50 dark:bg-gray-700 p-3 border-b border-gray-100 dark:border-gray-600">
                                                            <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                                                                <ClockIcon className="h-4 w-4 mr-2 text-blue-500" />
                                                                {timeSlot} ({rooms.length} room{rooms.length !== 1 ? 's' : ''})
                                                            </h4>
                                                        </div>
                                                        <div className="p-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                                {rooms.map(room => (
                                                                    <div key={room._id} className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700 transform transition-all duration-200 hover:scale-105 hover:shadow-md group">
                                                                        <div className="flex items-center justify-between mb-3">
                                                                            <div className="flex items-center space-x-2">
                                                                                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                                                                                    <span className="text-white text-xs font-bold">{room.zone || '?'}</span>
                                                                                </div>
                                                                                <span className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                                                                    {highlightSearchMatch(room.roomNumber, searchQuery)}
                                                                                </span>
                                                                            </div>
                                                                            <button 
                                                                                onClick={() => toggleBookmark(room.roomNumber)} 
                                                                                className="text-gray-400 hover:text-yellow-500 transition-all duration-200 transform hover:scale-110"
                                                                                title={bookmarkedClassrooms.has(room.roomNumber) ? 'Remove bookmark' : 'Add bookmark'}
                                                                            >
                                                                                <BookmarkIcon 
                                                                                    className={`h-5 w-5 ${bookmarkedClassrooms.has(room.roomNumber) ? 'text-yellow-500 fill-current' : 'hover:fill-current'}`} 
                                                                                />
                                                                            </button>
                                                                        </div>
                                                                        
                                                                        <div className="space-y-2">
                                                                            <div className="flex items-center justify-between text-xs">
                                                                                <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                                                                                    Floor {room.floor}
                                                                                </span>
                                                                                <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full font-medium">
                                                                                    Zone {room.zone}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
                                <MagnifyingGlassIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No available rooms match your criteria</p>
                                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Try adjusting your search query or filters</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
