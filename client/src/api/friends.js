// client/src/api/friends.js
import { API } from './auth';

// Set user availability status
export function setStatus(isFree) {
  return API.put('/friends/status', { isFree });
}

// Get all available friends
export function getFreeFriends() {
  return API.get('/friends/free');
}

// Get free classrooms
export function getFreeClassrooms() {
  return API.get('/free/classrooms');
}

// Get free labs
export function getFreeLabs() {
  return API.get('/free/labs');
}