// client/src/api/classrooms.js - Module 3 Classroom API
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Get auth token from session storage
const getAuthHeaders = () => {
  const token = sessionStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// Get all classrooms
export const getAllClassrooms = () => {
  return axios.get(`${API_BASE_URL}/classrooms/all`, {
    headers: getAuthHeaders()
  });
};

// Get available classrooms
export const getAvailableClassrooms = () => {
  return axios.get(`${API_BASE_URL}/classrooms`, {
    headers: getAuthHeaders()
  });
};

// Update classroom status
export const updateClassroomStatus = (id, status) => {
  return axios.put(`${API_BASE_URL}/classrooms/status`, { id, status }, {
    headers: getAuthHeaders()
  });
};

// Set all classrooms to available
export const setAllClassroomsAvailable = () => {
  return axios.put(`${API_BASE_URL}/classrooms/status/set-all-available`, {}, {
    headers: getAuthHeaders()
  });
};

// ========== MODULE 3: Enhanced Classroom API Functions ==========

// Get filtered classrooms with advanced filtering
export const getFilteredClassrooms = (filters = {}) => {
  const params = new URLSearchParams();
  
  Object.keys(filters).forEach(key => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.append(key, filters[key]);
    }
  });

  return axios.get(`${API_BASE_URL}/classrooms/filtered?${params.toString()}`, {
    headers: getAuthHeaders()
  });
};

// Get classroom availability for specific timeslot
export const getAvailabilityForTimeslot = (day, timeSlot, building = null, floor = null) => {
  const params = new URLSearchParams({ day, timeSlot });
  if (building) params.append('building', building);
  if (floor) params.append('floor', floor);

  return axios.get(`${API_BASE_URL}/classrooms/availability?${params.toString()}`, {
    headers: getAuthHeaders()
  });
};

// Update classroom timetable
export const updateClassroomTimetable = (roomId, timetable) => {
  return axios.put(`${API_BASE_URL}/classrooms/${roomId}/timetable`, { timetable }, {
    headers: getAuthHeaders()
  });
};

// Bulk update timetables from university data
export const bulkUpdateTimetables = (timetables) => {
  return axios.put(`${API_BASE_URL}/classrooms/timetables/bulk`, { timetables }, {
    headers: getAuthHeaders()
  });
};

// Get classroom statistics
export const getClassroomStats = (building = null, floor = null) => {
  const params = new URLSearchParams();
  if (building) params.append('building', building);
  if (floor) params.append('floor', floor);

  return axios.get(`${API_BASE_URL}/classrooms/stats?${params.toString()}`, {
    headers: getAuthHeaders()
  });
};
