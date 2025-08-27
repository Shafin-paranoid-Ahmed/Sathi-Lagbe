// client/src/pages/Routine.jsx
import { useState, useEffect } from 'react';
import { AcademicCapIcon, PlusCircleIcon, TrashIcon, PencilIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { getUserRoutine, addRoutineEntry, deleteRoutineEntry } from '../api/routine';

const timeSlots = [
    "08:00 AM-09:20 AM",
    "09:30 AM-10:50 AM", 
    "11:00 AM-12:20 PM",
    "12:30 PM-01:50 PM",
    "02:00 PM-03:20 PM",
    "03:30 PM-04:50 PM",
    "05:00 PM-06:20 PM"
];

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function Routine() {
    const [routineEntries, setRoutineEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newEntry, setNewEntry] = useState({ timeSlot: timeSlots[0], day: 'Monday', course: '' });
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState({});
    const [groupToggle, setGroupToggle] = useState(false);

    // Fetch user's routine on component mount
    useEffect(() => {
        fetchRoutine();
    }, []);

    const fetchRoutine = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await getUserRoutine();
            setRoutineEntries(response.data.data || []);
        } catch (err) {
            console.error('Error fetching routine:', err);
            setError('Failed to load routine');
        } finally {
            setLoading(false);
        }
    };

    const handleAddEntry = async (e) => {
        e.preventDefault();
        const { timeSlot, day, course } = newEntry;
        if (!timeSlot || !day || !course.trim()) return;

        try {
            setSubmitting(true);
            setError('');
            
            if (groupToggle) {
                // Group specific days when toggle is ON
                const groupedDays = getGroupedDays(day);
                const entries = [];
                
                for (const groupedDay of groupedDays) {
                    try {
                        const response = await addRoutineEntry({ 
                            timeSlot, 
                            day: groupedDay, 
                            course: course.trim() 
                        });
                        entries.push(response.data.data);
                    } catch (err) {
                        // If one day fails (e.g., already exists), continue with others
                        console.log(`Entry for ${groupedDay} skipped:`, err.response?.data?.error);
                    }
                }
                
                // Add all successful entries to state
                if (entries.length > 0) {
                    setRoutineEntries(prev => [...prev, ...entries]);
                }
            } else {
                // Normal single entry when toggle is OFF
                const response = await addRoutineEntry({ timeSlot, day, course: course.trim() });
                setRoutineEntries(prev => [...prev, response.data.data]);
            }
            
            // Reset form
            setNewEntry({ timeSlot: timeSlots[0], day: 'Monday', course: '' });
        } catch (err) {
            console.error('Error adding routine entry:', err);
            setError(err.response?.data?.error || 'Failed to add routine entry');
        } finally {
            setSubmitting(false);
        }
    };

    // Function to get grouped days based on the selected day
    const getGroupedDays = (selectedDay) => {
        const dayGroups = {
            'Sunday': ['Sunday', 'Tuesday'],
            'Monday': ['Monday', 'Wednesday'],
            'Tuesday': ['Sunday', 'Tuesday'],
            'Wednesday': ['Monday', 'Wednesday'],
            'Thursday': ['Saturday', 'Thursday'],
            'Friday': ['Friday'], // Friday is not grouped
            'Saturday': ['Saturday', 'Thursday']
        };
        
        return dayGroups[selectedDay] || [selectedDay];
    };

    const handleDeleteEntry = async (entryId) => {
        if (!window.confirm('Are you sure you want to delete this routine entry?')) return;

        try {
            setDeleting(prev => ({ ...prev, [entryId]: true }));
            setError('');
            
            // Find the entry to be deleted
            const entryToDelete = routineEntries.find(entry => entry._id === entryId);
            
            if (groupToggle && entryToDelete) {
                // If grouping is enabled, find and delete all entries in the same group
                const groupedDays = getGroupedDays(entryToDelete.day);
                const entriesToDelete = routineEntries.filter(entry => 
                    entry.timeSlot === entryToDelete.timeSlot && 
                    entry.course === entryToDelete.course &&
                    groupedDays.includes(entry.day)
                );
                
                // Delete all entries in the group
                for (const entry of entriesToDelete) {
                    try {
                        await deleteRoutineEntry(entry._id);
                    } catch (err) {
                        console.error(`Error deleting entry ${entry._id}:`, err);
                    }
                }
                
                // Remove all grouped entries from state
                setRoutineEntries(prev => prev.filter(entry => 
                    !(entry.timeSlot === entryToDelete.timeSlot && 
                      entry.course === entryToDelete.course &&
                      groupedDays.includes(entry.day))
                ));
            } else {
                // Normal single entry deletion
                await deleteRoutineEntry(entryId);
                setRoutineEntries(prev => prev.filter(entry => entry._id !== entryId));
            }
        } catch (err) {
            console.error('Error deleting routine entry:', err);
            setError(err.response?.data?.error || 'Failed to delete routine entry');
        } finally {
            setDeleting(prev => ({ ...prev, [entryId]: false }));
        }
    };

    // Convert routine entries to table format
    const getTableData = () => {
        const tableData = [];
        
        timeSlots.forEach(timeSlot => {
            const row = { "Time/Day": timeSlot };
            days.forEach(day => {
                const entry = routineEntries.find(e => e.timeSlot === timeSlot && e.day === day);
                row[day] = entry ? entry : null;
            });
            tableData.push(row);
        });
        
        return tableData;
    };

    const tableData = getTableData();

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Routine</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Manage your weekly academic schedule.
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
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Routine</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Manage your weekly academic schedule.
                </p>
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    <PlusCircleIcon className="h-6 w-6 inline-block mr-2" />
                    Add to Schedule
                </h2>
                
                {/* Group Toggle */}
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <UserGroupIcon className="h-5 w-5 text-blue-600" />
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 dark:text-white">Group Days</h3>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {groupToggle ? 
                                        'ON: Sunday+Tuesday, Monday+Wednesday, Saturday+Thursday' : 
                                        'OFF: Add to single day only'
                                    }
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setGroupToggle(!groupToggle)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                groupToggle ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    groupToggle ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>
                
                {/* Grouping Info */}
                {groupToggle && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <div className="flex items-start space-x-2">
                            <UserGroupIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-blue-800 dark:text-blue-200">
                                <p className="font-medium">Grouping Active:</p>
                                <ul className="mt-1 space-y-1 text-xs">
                                    <li>• <strong>Sunday</strong> + <strong>Tuesday</strong></li>
                                    <li>• <strong>Monday</strong> + <strong>Wednesday</strong></li>
                                    <li>• <strong>Saturday</strong> + <strong>Thursday</strong></li>
                                    <li>• <strong>Friday</strong> remains single (no grouping)</li>
                                </ul>
                                <p className="mt-2 text-xs opacity-80">
                                    When you add a course, it will automatically be added to both days in the group.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                <form onSubmit={handleAddEntry} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time Slot</label>
                        <select 
                            id="time" 
                            value={newEntry.timeSlot} 
                            onChange={e => setNewEntry({...newEntry, timeSlot: e.target.value})} 
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            {timeSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="day" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Day</label>
                        <select 
                            id="day" 
                            value={newEntry.day} 
                            onChange={e => setNewEntry({...newEntry, day: e.target.value})} 
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            {days.map(day => <option key={day} value={day}>{day}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="course" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Course/Activity</label>
                        <input 
                            type="text" 
                            id="course" 
                            value={newEntry.course} 
                            onChange={e => setNewEntry({...newEntry, course: e.target.value})} 
                            placeholder="e.g., CSE110" 
                            className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={submitting}
                        className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Adding...' : groupToggle ? 'Add to Group' : 'Add Entry'}
                    </button>
                </form>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    <AcademicCapIcon className="h-6 w-6 inline-block mr-2" />
                    Course Routine
                </h2>
                
                {routineEntries.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <AcademicCapIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No routine entries yet. Add your first course or activity above!</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Time/Day
                                    </th>
                                    {days.map(day => (
                                        <th key={day} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            {day}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {tableData.map((row, index) => (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                                            {row["Time/Day"]}
                                        </td>
                                                                                 {days.map(day => {
                                             const entry = row[day];
                                             
                                             return (
                                                 <td key={day} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                                     {entry ? (
                                                         <div className="flex items-center justify-between group">
                                                             <span>{entry.course}</span>
                                                             <button
                                                                 onClick={() => handleDeleteEntry(entry._id)}
                                                                 disabled={deleting[entry._id]}
                                                                 className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-red-500 hover:text-red-700 transition-opacity"
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
                                                         <span className="text-gray-400">—</span>
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
}
