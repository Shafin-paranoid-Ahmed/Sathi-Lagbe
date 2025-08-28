// client/src/pages/Routine.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { AcademicCapIcon, PlusCircleIcon, TrashIcon, UserGroupIcon, XMarkIcon, WifiIcon, BookOpenIcon, ClockIcon, CheckCircleIcon, ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getUserRoutine, addRoutineEntry, deleteRoutineEntry, getFriendsRoutines } from '../api/routine';
import { getFriendsWithStatus } from '../api/friends';

const timeSlots = [
    "08:00 AM-09:20 AM", "09:30 AM-10:50 AM", "11:00 AM-12:20 PM",
    "12:30 PM-01:50 PM", "02:00 PM-03:20 PM", "03:30 PM-04:50 PM",
    "05:00 PM-06:20 PM"
];

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Helper to get an icon for a friend's status
const getStatusInfo = (status) => {
    switch (status) {
        case 'free': return { Icon: CheckCircleIcon, color: 'text-orange-500', label: 'Free' };
        case 'available': return { Icon: WifiIcon, color: 'text-green-500', label: 'Available' };
        case 'in_class': return { Icon: BookOpenIcon, color: 'text-blue-500', label: 'In Class' };
        case 'studying': return { Icon: BookOpenIcon, color: 'text-purple-500', label: 'Studying' };
        case 'busy': return { Icon: ClockIcon, color: 'text-red-500', label: 'Busy' };
        default: return { Icon: WifiIcon, color: 'text-gray-400', label: 'Unknown' };
    }
};

// Popup Component to show friends with search and sorting
const FriendsPopup = ({ friends, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');

    const processedFriends = useMemo(() => {
        // 1. Initial filter to remove 'busy' friends
        let filtered = friends.filter(friend => friend.status?.current !== 'busy');
        const lowercasedQuery = searchQuery.toLowerCase().trim();

        // 2. Apply search filter
        if (lowercasedQuery) {
            // Check for status search like .free.
            if (lowercasedQuery.startsWith('.') && lowercasedQuery.endsWith('.')) {
                // Remove periods and convert space to underscore
                const statusQuery = lowercasedQuery.slice(1, -1).replace(' ', '_');
                const validStatuses = ["free", "available", "studying", "in_class"];
                
                if (validStatuses.includes(statusQuery)) {
                    filtered = filtered.filter(friend => friend.status?.current === statusQuery);
                } else {
                    // Handle common non-underscored input (e.g., "in class")
                    const nonUnderscoreStatus = lowercasedQuery.slice(1, -1);
                    if (nonUnderscoreStatus === 'in class') {
                         filtered = filtered.filter(friend => friend.status?.current === 'in_class');
                    } else {
                         // If status is not recognized, show nothing
                         filtered = [];
                    }
                }

            } else {
                // Normal name search
                filtered = filtered.filter(friend =>
                    friend.name.toLowerCase().includes(lowercasedQuery)
                );
            }
        }

        // 3. Apply sorting based on status priority
        const statusOrder = {
            'free': 1,
            'available': 2,
            'studying': 3,
            'in_class': 4,
        };

        return filtered.sort((a, b) => {
            const statusA = a.status?.current || 'unknown';
            const statusB = b.status?.current || 'unknown';
            const orderA = statusOrder[statusA] || 5; // Default to a lower priority
            const orderB = statusOrder[statusB] || 5;
            return orderA - orderB;
        });
    }, [friends, searchQuery]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg m-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Available Friends</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <XMarkIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder='Search by name or .status. (e.g., .free.)'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500"
                    />
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto">
                    {processedFriends.length > 0 ? processedFriends.map(friend => {
                        const { Icon, color, label } = getStatusInfo(friend.status?.current);
                        return (
                            <div key={friend._id} className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                                <img src={friend.avatarUrl || `https://ui-avatars.com/api/?name=${friend.name}&background=random`} alt={friend.name} className="h-10 w-10 rounded-full object-cover" />
                                <div className="flex-1">
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{friend.name}</p>
                                    <div className={`flex items-center text-sm ${color}`}>
                                        <Icon className="h-4 w-4 mr-1.5" />
                                        <span>{label}{friend.status?.location ? ` at ${friend.status.location}` : ''}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-4">No friends match your search.</p>
                    )}
                </div>
            </div>
        </div>
    );
};


// Component for empty slots (now counts 'available' friends as free)
const FreeSlot = ({ day, timeSlot, friends, friendsRoutines, onSlotClick }) => {
    const availableFriends = useMemo(() => {
        const busyFriendIds = new Set(
            friendsRoutines
                .filter(entry => entry.day === day && entry.timeSlot === timeSlot)
                .map(entry => entry.userId)
        );
        return friends.filter(friend => !busyFriendIds.has(friend._id));
    }, [day, timeSlot, friends, friendsRoutines]);

    const freeNowCount = availableFriends.filter(f => ['free', 'available'].includes(f.status?.current)).length;

    if (freeNowCount === 0) {
        return <span className="text-gray-400 text-center block">—</span>;
    }

    return (
        <button onClick={() => onSlotClick(availableFriends)} className="w-full h-full text-left p-1">
            <div className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-md p-2 text-center text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900 transition-colors">
                <UserGroupIcon className="h-5 w-5 mx-auto mb-1" />
                {freeNowCount} {freeNowCount > 1 ? 'Friends' : 'Friend'} Free
            </div>
        </button>
    );
};


export default function Routine() {
    const [routineEntries, setRoutineEntries] = useState([]);
    const [friendsRoutines, setFriendsRoutines] = useState([]);
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [newEntry, setNewEntry] = useState({ timeSlot: timeSlots[0], day: 'Sunday+Tuesday', course: '' });
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState({});
    const [groupToggle, setGroupToggle] = useState(true); // Default to grouped view
    const [popupFriends, setPopupFriends] = useState(null);

    // Dropdown options for Day based on grouping toggle
    const getDropdownDays = () => {
        if (groupToggle) {
            return [
                { value: 'Sunday+Tuesday', label: 'Sunday + Tuesday', days: ['Sunday', 'Tuesday'] },
                { value: 'Monday+Wednesday', label: 'Monday + Wednesday', days: ['Monday', 'Wednesday'] },
                { value: 'Saturday+Thursday', label: 'Saturday + Thursday', days: ['Saturday', 'Thursday'] },
                { value: 'Friday', label: 'Friday (Single)', days: ['Friday'] }
            ];
        }
        return days.map(d => ({ value: d, label: d, days: [d] }));
    };

    // When toggle changes, reset the selected day to the first option of the new mode
    useEffect(() => {
        setNewEntry(prev => ({
            ...prev,
            day: getDropdownDays()[0].value,
            course: '' // Also clear course input
        }));
    }, [groupToggle]);

    // Fetch all data on initial load
    useEffect(() => {
        const initialLoad = async () => {
            try {
                setLoading(true);
                setError('');
                const [routineRes, friendsRes, friendsRoutinesRes] = await Promise.all([
                    getUserRoutine(),
                    getFriendsWithStatus(),
                    getFriendsRoutines()
                ]);
                setRoutineEntries(routineRes.data.data || []);
                setFriends(friendsRes.data || []);
                setFriendsRoutines(friendsRoutinesRes.data.data || []);
            } catch (err) {
                console.error('Error fetching initial data:', err);
                setError('Failed to load routine data');
            } finally {
                setLoading(false);
            }
        };
        initialLoad();
    }, []);
    
    // Refresh function now ONLY fetches friend statuses for efficiency
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const friendsRes = await getFriendsWithStatus();
            setFriends(friendsRes.data || []);
        } catch (err) {
            console.error('Error refreshing friend status:', err);
            setError('Failed to refresh friend status');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleAddEntry = async (e) => {
        e.preventDefault();
        const { timeSlot, day, course } = newEntry;
        if (!timeSlot || !day || !course.trim()) return;

        try {
            setSubmitting(true);
            setError('');
            setSuccess('');
            let addedCount = 0;
            
            const selectedOption = getDropdownDays().find(opt => opt.value === day);
            const daysToAdd = selectedOption ? selectedOption.days : [];
            
            // Check if ANY entry already exists for the days at this time slot
            const existingEntries = routineEntries.filter(entry => 
                entry.timeSlot === timeSlot && daysToAdd.includes(entry.day)
            );
            
            if (existingEntries.length > 0) {
                const existingDays = existingEntries.map(e => e.day).join(', ');
                setError(`Entries already exist for ${existingDays} at ${timeSlot}. Please choose a different time or day.`);
                setSubmitting(false);
                return;
            }
            
            const createdEntries = [];
            
            for (const currentDay of daysToAdd) {
                try {
                    const response = await addRoutineEntry({ 
                        timeSlot, 
                        day: currentDay, 
                        course: course.trim() 
                    });
                    createdEntries.push(response.data.data);
                } catch (err) {
                    console.error(`Entry for ${currentDay} failed:`, err.response?.data?.error);
                    setError(`Failed to add entry for ${currentDay}: ${err.response?.data?.error || 'Unknown error'}`);
                    // Clean up already created entries if one fails
                    await Promise.all(createdEntries.map(e => deleteRoutineEntry(e._id)));
                    setSubmitting(false);
                    return;
                }
            }
            
            // Add all successful entries to state
            if (createdEntries.length > 0) {
                setRoutineEntries(prev => [...prev, ...createdEntries]);
                addedCount += createdEntries.length;
            }
            
            // Reset form
            setNewEntry(prev => ({
                ...prev,
                day: getDropdownDays()[0].value,
                course: ''
            }));
            
            // Show success message
            setSuccess(
                addedCount > 1
                    ? `Successfully added ${addedCount} entries to the routine!`
                    : 'Routine entry added successfully!'
            );
            
            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error adding routine entry:', err);
            setError(err.response?.data?.error || 'Failed to add routine entry');
        } finally {
            setSubmitting(false);
        }
    };

    const getGroupedDays = (selectedDay) => {
        const dayGroups = {
            'Sunday': ['Sunday', 'Tuesday'], 'Monday': ['Monday', 'Wednesday'],
            'Tuesday': ['Sunday', 'Tuesday'], 'Wednesday': ['Monday', 'Wednesday'],
            'Thursday': ['Saturday', 'Thursday'], 'Friday': ['Friday'],
            'Saturday': ['Saturday', 'Thursday']
        };
        return dayGroups[selectedDay] || [selectedDay];
    };

    const handleDeleteEntry = async (entryId) => {
        if (!window.confirm('Are you sure you want to delete this routine entry? This might delete grouped entries.')) return;

        try {
            setDeleting(prev => ({ ...prev, [entryId]: true }));
            setError('');
            
            const entryToDelete = routineEntries.find(entry => entry._id === entryId);
            if (!entryToDelete) return;
            
            const entriesToDeleteIds = new Set();
            if (groupToggle) {
                const groupedDays = getGroupedDays(entryToDelete.day);
                routineEntries.forEach(entry => {
                    if (entry.timeSlot === entryToDelete.timeSlot && 
                        entry.course === entryToDelete.course &&
                        groupedDays.includes(entry.day)) {
                        entriesToDeleteIds.add(entry._id);
                    }
                });
            } else {
                entriesToDeleteIds.add(entryId);
            }

            if (entriesToDeleteIds.size > 0) {
                await Promise.all(Array.from(entriesToDeleteIds).map(id => deleteRoutineEntry(id)));
                setRoutineEntries(prev => prev.filter(entry => !entriesToDeleteIds.has(entry._id)));
            }
        } catch (err) {
            console.error('Error deleting routine entry:', err);
            setError(err.response?.data?.error || 'Failed to delete routine entry');
        } finally {
            setDeleting(prev => ({ ...prev, [entryId]: false }));
        }
    };

    const getTableData = () => {
        const tableData = [];
        timeSlots.forEach(timeSlot => {
            const row = { "Time/Day": timeSlot };
            days.forEach(day => {
                row[day] = routineEntries.find(e => e.timeSlot === timeSlot && e.day === day) || null;
            });
            tableData.push(row);
        });
        return tableData;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Routine</h1>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {popupFriends && <FriendsPopup friends={popupFriends} onClose={() => setPopupFriends(null)} />}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Routine</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your weekly schedule and see when friends are free.</p>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded animate-fade-in transform transition-all duration-300">
                    <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="font-medium">{error}</span>
                    </div>
                </div>
            )}

            {/* Success Display */}
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded animate-fade-in transform transition-all duration-300">
                    <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="font-medium">{success}</span>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-soft-2xl">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <PlusCircleIcon className="h-6 w-6 inline-block mr-2 text-green-500" />
                    Add to Schedule
                </h2>
                
                {/* Group Toggle */}
                 <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                     <div className="flex items-center justify-between">
                         <div className="flex items-center space-x-3">
                             <UserGroupIcon className="h-5 w-5 text-blue-600" />
                             <div>
                                 <h3 className="text-sm font-medium text-gray-900 dark:text-white">Day Grouping</h3>
                                 <p className="text-xs text-gray-600 dark:text-gray-400">
                                     {groupToggle ? 'ON: Adds/Deletes for paired days' : 'OFF: Add to single day only'}
                                 </p>
                             </div>
                         </div>
                         <button type="button" onClick={() => setGroupToggle(!groupToggle)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${groupToggle ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}>
                             <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${groupToggle ? 'translate-x-6' : 'translate-x-1'}`} />
                         </button>
                     </div>
                 </div>
                
                <form onSubmit={handleAddEntry} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="transform transition-all duration-200 hover:scale-105">
                        <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time Slot</label>
                        <select 
                            id="time" 
                            value={newEntry.timeSlot} 
                            onChange={e => setNewEntry({...newEntry, timeSlot: e.target.value})} 
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all duration-200 hover:border-blue-400"
                        >
                            {timeSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                        </select>
                    </div>
                    <div className="transform transition-all duration-200 hover:scale-105">
                        <label htmlFor="day" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Day</label>
                        <select 
                            id="day" 
                            value={newEntry.day} 
                            onChange={e => setNewEntry({...newEntry, day: e.target.value})} 
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all duration-200 hover:border-blue-400"
                        >
                            {getDropdownDays().map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="transform transition-all duration-200 hover:scale-105">
                        <label htmlFor="course" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Course/Activity</label>
                        <input 
                            type="text" 
                            id="course" 
                            value={newEntry.course} 
                            onChange={e => setNewEntry({...newEntry, course: e.target.value})} 
                            placeholder="e.g., CSE110" 
                            className="mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-all duration-200 hover:border-blue-400" 
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={submitting}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                    >
                        {submitting ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Adding...</span>
                            </div>
                        ) : (
                            <span>{groupToggle ? 'Add to Group' : 'Add Single Entry'}</span>
                        )}
                    </button>
                </form>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6 transform transition-all duration-300 hover:scale-[1.01] hover:shadow-soft-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                        <AcademicCapIcon className="h-6 w-6 inline-block mr-2 text-purple-500" />
                        Course Routine
                    </h2>
                     <button 
                        onClick={handleRefresh} 
                        disabled={isRefreshing} 
                        className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh friends status"
                    >
                        <ArrowPathIcon className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                
                 {routineEntries.length === 0 ? (
                     <div className="text-center py-8 text-gray-500 dark:text-gray-400 animate-fade-in">
                         <AcademicCapIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                         <p className="text-lg">No routine entries yet. Add your first course or activity above!</p>
                     </div>
                 ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                             <thead className="bg-gray-50 dark:bg-gray-700">
                                 <tr>
                                     <th scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                         Time/Day
                                     </th>
                                     {days.map(day => (
                                         <th key={day} scope="col" className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                             {day}
                                         </th>
                                     ))}
                                 </tr>
                             </thead>
                             <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                                 {getTableData().map((row, index) => (
                                     <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                         <td className="px-2 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">{row["Time/Day"]}</td>
                                         {days.map(day => {
                                             const entry = row[day];
                                             return (
                                                 <td key={day} className="px-2 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 align-top">
                                                     {entry ? (
                                                         <div className="flex items-center justify-between group bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                                                             <span className="font-medium">{entry.course}</span>
                                                             <button
                                                                 onClick={() => handleDeleteEntry(entry._id)}
                                                                 disabled={deleting[entry._id]}
                                                                 className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-red-500 hover:text-red-700"
                                                                 title="Delete entry"
                                                             >
                                                                 {deleting[entry._id] ? (
                                                                     <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                                                 ) : (
                                                                     <TrashIcon className="h-4 w-4" />
                                                                 )}
                                                             </button>
                                                         </div>
                                                     ) : (
                                                        <FreeSlot day={day} timeSlot={row["Time/Day"]} friends={friends} friendsRoutines={friendsRoutines} onSlotClick={(availableFriends) => setPopupFriends(availableFriends)} />
                                                     )}
                                                 </td>
                                             );
                                         })}
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                    </div>
                )}
            </div>
        </div>
    );
}```