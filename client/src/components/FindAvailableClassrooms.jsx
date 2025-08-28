// client/src/components/FindAvailableClassrooms.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { getFreeClassrooms } from '../api/free';
import { 
    getBookmarkedClassrooms,
    addClassroomBookmark,
    removeClassroomBookmark
} from '../api/users';
import { MagnifyingGlassIcon, MapPinIcon, BuildingOfficeIcon, BookmarkIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

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
        day: 'monday',
        timeSlot: timeSlots[0],
        floor: ''
    });
    const [availableRooms, setAvailableRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [bookmarkedClassrooms, setBookmarkedClassrooms] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');

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
        
        const selectedSlotData = scheduleRows.find(row => row['Time/Day'] === filters.timeSlot);
        const availableRoomCodes = selectedSlotData ? parseRoomCodes(selectedSlotData[capitalize(filters.day)]) : [];

        // Filter room codes based on the criteria
        let filteredRoomCodes = availableRoomCodes.filter(roomCode => {
            // Floor filtering - extract floor from room code like "12A-09C"
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
        
        // Create room objects from the filtered room codes
        const roomObjects = filteredRoomCodes.map(roomCode => {
            const floor = extractFloorFromRoomCode(roomCode);
            const zone = extractZoneFromRoomCode(roomCode);
            const classroomNumber = extractClassroomNumberFromRoomCode(roomCode);
            
            return {
                _id: roomCode, // Use room code as ID since we don't have actual IDs
                roomNumber: roomCode,
                floor: floor,
                zone: zone,
                classroomNumber: classroomNumber,
                building: 'Main Building', // Default building for Free Classroom database
                capacity: 'Unknown',
                roomType: 'Classroom',
                facilities: []
            };
        });
        
        // Sort by room number
        roomObjects.sort((a, b) => (a.roomNumber || '').localeCompare(b.roomNumber || ''));

        setAvailableRooms(roomObjects);
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
                {/* Search bar */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        🔍 Search Classrooms
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by room code (e.g., '7a', '12A-09', '07B-15C')..."
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        />
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">💡 Search tips:</span> 
                        <span className="ml-1">Type "7a" for 7th floor A zone, "12" for all 12th floor rooms, or "a" for all A zone rooms</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Day filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Day</label>
                        <select name="day" value={filters.day} onChange={handleFilterChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                            {days.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                    </div>

                    {/* Time slot filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Slot</label>
                        <select name="timeSlot" value={filters.timeSlot} onChange={handleFilterChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                            {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    {/* Floor filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Floor (Optional)</label>
                        <input type="number" name="floor" value={filters.floor} onChange={handleFilterChange} placeholder="e.g., 7" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>

                    {/* Search button */}
                    <div className="flex items-end">
                        <button 
                            onClick={handleSearch} 
                            disabled={searching} 
                            className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {searching ? (
                                <div className="flex items-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Searching...</span>
                                </div>
                            ) : (
                                <>
                                    <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                                    Search Classrooms
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Results */}
            {searched && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-soft-2xl">
                    <div className="mb-4">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                            <AcademicCapIcon className="h-6 w-6 inline-block mr-2 text-green-500" />
                            Search Results ({availableRooms.length} room{availableRooms.length !== 1 ? 's' : ''} found)
                        </h2>
                        {searchQuery && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <span className="font-medium">Searching for:</span> "{searchQuery}" 
                                {filters.day && <span className="ml-2">• <span className="font-medium">Day:</span> {days.find(d => d.value === filters.day)?.label}</span>}
                                {filters.timeSlot && <span className="ml-2">• <span className="font-medium">Time:</span> {filters.timeSlot}</span>}
                            </p>
                        )}
                    </div>
                    {availableRooms.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableRooms.map(room => (
                                <div key={room._id} className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-5 border border-green-200 dark:border-green-700 transform transition-all duration-300 hover:scale-105 hover:shadow-lg group">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                                                <span className="text-white text-sm font-bold">{room.zone || '?'}</span>
                                            </div>
                                            <span className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                                {highlightSearchMatch(room.roomNumber, searchQuery)}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => toggleBookmark(room.roomNumber)} 
                                            className="text-gray-400 hover:text-yellow-500 transition-all duration-200 transform hover:scale-110"
                                            title={bookmarkedClassrooms.has(room.roomNumber) ? 'Remove bookmark' : 'Add bookmark'}
                                        >
                                            <BookmarkIcon 
                                                className={`h-7 w-7 ${bookmarkedClassrooms.has(room.roomNumber) ? 'text-yellow-500 fill-current' : 'hover:fill-current'}`} 
                                            />
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-2 bg-white dark:bg-gray-700 p-2 rounded-lg">
                                            <BuildingOfficeIcon className="h-4 w-4 text-blue-500" />
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                                                Floor {room.floor}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2 bg-white dark:bg-gray-700 p-2 rounded-lg">
                                            <MapPinIcon className="h-4 w-4 text-purple-500" />
                                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                                                {room.building}
                                            </span>
                                        </div>
                                        {room.zone && room.classroomNumber && (
                                            <div className="flex justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-2 rounded-lg">
                                                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                                                    Zone {room.zone}
                                                </span>
                                                <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full font-medium">
                                                    Room {room.classroomNumber}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
                                <MagnifyingGlassIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No available rooms match your criteria</p>
                                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Try adjusting your filters or selecting a different time slot</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
