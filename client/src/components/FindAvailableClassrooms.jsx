// client/src/components/FindAvailableClassrooms.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { getFreeClassrooms } from '../api/free';
import { 
    getBookmarkedClassrooms,
    addClassroomBookmark,
    removeClassroomBookmark
} from '../api/users';
import { MagnifyingGlassIcon, MapPinIcon, BuildingOfficeIcon, BookmarkIcon } from '@heroicons/react/24/outline';

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
    }, [scheduleRows, filters, loading]);

    useEffect(() => {
        // Perform an initial search when the component data has loaded
        if (!loading) {
            handleSearch();
        }
    }, [loading, handleSearch]);

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

    if (loading) {
        return <div className="text-center p-8">Loading classroom data...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Find an Available Classroom</h3>
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Floor</label>
                        <input type="number" name="floor" value={filters.floor} onChange={handleFilterChange} placeholder="e.g., 7" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>

                    {/* Search button */}
                    <div className="flex items-end">
                        <button onClick={handleSearch} disabled={searching} className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                            <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                            {searching ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Results */}
            {searched && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Available Rooms ({availableRooms.length})
                    </h3>
                    {availableRooms.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {availableRooms.map(room => (
                                <div key={room._id} className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-sm font-bold">{room.zone || '?'}</span>
                                            </div>
                                            <span className="text-lg font-bold text-gray-900 dark:text-white">{room.roomNumber}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button 
                                                onClick={() => toggleBookmark(room.roomNumber)} 
                                                className="text-gray-400 hover:text-yellow-500 transition-colors"
                                                title={bookmarkedClassrooms.has(room.roomNumber) ? 'Remove bookmark' : 'Add bookmark'}
                                            >
                                                <BookmarkIcon 
                                                    className={`h-6 w-6 ${bookmarkedClassrooms.has(room.roomNumber) ? 'text-yellow-500 fill-current' : ''}`} 
                                                />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center space-x-2">
                                            <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-600 dark:text-gray-400">
                                                Floor {room.floor}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <MapPinIcon className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {room.building}
                                            </span>
                                        </div>
                                        {room.zone && room.classroomNumber && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Zone {room.zone} • Room {room.classroomNumber}
                                            </div>
                                        )}
                                        {room.capacity && room.capacity !== 'Unknown' && (
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                Capacity: {room.capacity}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">No available rooms match your criteria. Try different filters.</p>
                    )}
                </div>
            )}
        </div>
    );
}
