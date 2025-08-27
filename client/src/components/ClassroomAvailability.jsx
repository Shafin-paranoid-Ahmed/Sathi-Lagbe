// client/src/components/ClassroomAvailability.jsx - Module 3 Enhanced Classroom Availability
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
  CogIcon
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
  
  // Module 3: Filter states
  const [filters, setFilters] = useState({
    floor: '',
    minCapacity: '',
    maxCapacity: '',
    building: '',
    roomType: '',
    timeSlot: '',
    day: '',
    facilities: '',
    status: ''
  });

  // Module 3: Time-based availability states
  const [selectedDay, setSelectedDay] = useState('monday');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('08:00-09:20');
  const [availabilityData, setAvailabilityData] = useState(null);

  // Module 3: UI states
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const timeSlots = [
    '08:00-09:20',
    '09:30-10:50',
    '11:00-12:20',
    '12:30-01:50',
    '02:00-03:20',
    '03:30-04:50',
    '05:00-06:20'
  ];

  const days = [
    { value: 'sunday', label: 'Sunday' },
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' }
  ];

  const roomTypes = ['Classroom', 'Lab', 'Conference', 'Seminar'];
  const facilities = ['Projector', 'AC', 'Whiteboard', 'Computer', 'Sound System'];

  // Fetch filtered classrooms
  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      setError('');
      
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, value]) => value !== '')
      );
      
      const response = await getFilteredClassrooms(activeFilters);
      setClassrooms(response.data.classrooms);
    } catch (err) {
      console.error('Error fetching classrooms:', err);
      setError('Failed to load classrooms.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch classroom statistics
  const fetchStats = async () => {
    try {
      const response = await getClassroomStats(filters.building || null, filters.floor || null);
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Fetch availability for specific timeslot
  const fetchAvailability = async () => {
    try {
      const response = await getAvailabilityForTimeslot(
        selectedDay,
        selectedTimeSlot,
        filters.building || null,
        filters.floor || null
      );
      setAvailabilityData(response.data);
    } catch (err) {
      console.error('Error fetching availability:', err);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters
  const applyFilters = () => {
    fetchClassrooms();
    fetchStats();
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      floor: '',
      minCapacity: '',
      maxCapacity: '',
      building: '',
      roomType: '',
      timeSlot: '',
      day: '',
      facilities: '',
      status: ''
    });
  };

  // Sync with university timetable (Module 3)
  const syncUniversityTimetable = async () => {
    try {
      // Sample university timetable data - in real implementation, this would come from university API
      const sampleTimetables = [
        {
          roomId: 'sample-room-id',
          timetable: {
            schedule: {
              monday: [
                { timeSlot: '08:00-09:20', course: 'CSE341-02-SBAW-10A-04C', isOccupied: true },
                { timeSlot: '09:30-10:50', course: '', isOccupied: false }
              ]
            }
          }
        }
      ];

      await bulkUpdateTimetables(sampleTimetables);
      fetchClassrooms();
      alert('University timetable synchronized successfully!');
    } catch (err) {
      console.error('Error syncing timetable:', err);
      alert('Failed to sync university timetable.');
    }
  };

  useEffect(() => {
    fetchClassrooms();
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'availability') {
      fetchAvailability();
    }
  }, [selectedDay, selectedTimeSlot, activeTab]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return 'text-green-600 bg-green-100';
      case 'occupied':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Module 3: Enhanced Classroom Availability
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Advanced classroom availability system with university timetable integration, floor capacity filtering, and timeslot management.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'all', name: 'All Classrooms', icon: AcademicCapIcon },
            { id: 'availability', name: 'Time-based Availability', icon: ClockIcon },
            { id: 'stats', name: 'Statistics', icon: ChartBarIcon },
            { id: 'filters', name: 'Advanced Filters', icon: FunnelIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Content will be added in next part */}
      <div className="text-center py-8">
        <AcademicCapIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Module 3 Classroom Availability System</p>
      </div>
    </div>
  );
}
