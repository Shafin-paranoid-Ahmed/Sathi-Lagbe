// client/src/api/free.js
import { API } from './auth';

// Get free classrooms (schedule rows)
export function getFreeClassrooms() {
  return API.get('/free/classrooms');
}

// Get free labs
export function getFreeLabs() {
  return API.get('/free/labs');
}
