// client/src/pages/Routine.jsx
import { useState } from 'react';
import { AcademicCapIcon, PlusCircleIcon } from '@heroicons/react/24/outline';

const initialScheduleData = [
    { "Time/Day": "08:00 AM-09:20 AM", "Sunday": "", "Monday": "CSE341-02-SBAW-10A-04C", "Tuesday": "CSE341-02-SBAW-12F-31L", "Wednesday": "CSE341-02-SBAW-10A-04C", "Thursday": "CSE471-08-TBA-09E-22L", "Friday": "", "Saturday": "" },
    { "Time/Day": "09:30 AM-10:50 AM", "Sunday": "", "Monday": "", "Tuesday": "CSE341-02-SBAW-12F-31L", "Wednesday": "", "Thursday": "CSE471-08-TBA-09E-22L", "Friday": "", "Saturday": "" },
    { "Time/Day": "11:00 AM-12:20 PM", "Sunday": "", "Monday": "", "Tuesday": "", "Wednesday": "CSE321-14-ZMD-09F-25L", "Thursday": "", "Friday": "", "Saturday": "" },
    { "Time/Day": "12:30 PM-01:50 PM", "Sunday": "CSE321-14-ZMD-09D-18C", "Monday": "", "Tuesday": "CSE321-14-ZMD-09D-18C", "Wednesday": "CSE321-14-ZMD-09F-25L", "Thursday": "", "Friday": "", "Saturday": "" },
    { "Time/Day": "02:00 PM-03:20 PM", "Sunday": "CSE460-02-UPM-09D-17C", "Monday": "CSE460-02-UPM-10E-27L", "Tuesday": "CSE460-02-UPM-09D-17C", "Wednesday": "", "Thursday": "", "Friday": "", "Saturday": "" },
    { "Time/Day": "03:30 PM-04:50 PM", "Sunday": "CSE471-08-TBA-08H-22C", "Monday": "CSE460-02-UPM-10E-27L", "Tuesday": "CSE471-08-TBA-08H-22C", "Wednesday": "", "Thursday": "", "Friday": "", "Saturday": "" },
    { "Time/Day": "05:00 PM-06:20 PM", "Sunday": "", "Monday": "", "Tuesday": "", "Wednesday": "", "Thursday": "", "Friday": "", "Saturday": "" }
];

const days = ["Time/Day", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const timeSlots = initialScheduleData.map(row => row["Time/Day"]);

export default function Routine() {
    const [scheduleData, setScheduleData] = useState(initialScheduleData);
    const [newEntry, setNewEntry] = useState({ time: timeSlots[0], day: 'Sunday', course: '' });

    const handleAddEntry = (e) => {
        e.preventDefault();
        const { time, day, course } = newEntry;
        if (!time || !day || !course) return;

        setScheduleData(prev => {
            return prev.map(row => {
                if (row["Time/Day"] === time) {
                    return { ...row, [day]: course };
                }
                return row;
            });
        });
        setNewEntry({ time: timeSlots[0], day: 'Sunday', course: '' });
    };
    
    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Routine</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Manage your weekly academic schedule.
                </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    <PlusCircleIcon className="h-6 w-6 inline-block mr-2" />
                    Add to Schedule
                </h2>
                <form onSubmit={handleAddEntry} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Time Slot</label>
                        <select id="time" value={newEntry.time} onChange={e => setNewEntry({...newEntry, time: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            {timeSlots.map(slot => <option key={slot} value={slot}>{slot}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="day" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Day</label>
                        <select id="day" value={newEntry.day} onChange={e => setNewEntry({...newEntry, day: e.target.value})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                            {days.filter(d => d !== "Time/Day").map(day => <option key={day} value={day}>{day}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="course" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Course/Activity</label>
                        <input type="text" id="course" value={newEntry.course} onChange={e => setNewEntry({...newEntry, course: e.target.value})} placeholder="e.g., CSE110" className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    <button type="submit" className="bg-primary-500 text-white px-4 py-2 rounded-md hover:bg-primary-600">Add Entry</button>
                </form>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-xl p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    <AcademicCapIcon className="h-6 w-6 inline-block mr-2" />
                    Course Routine
                </h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                {days.map(day => (
                                    <th key={day} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {scheduleData.map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                                    {days.map(day => (
                                        <td key={day} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                                            {row[day] || ""}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
