// client/src/api/users.js
import { API } from './auth';

// Get all users for the friend list
export function getAllUsers() {
  return API.get('/users');
}

// Add a user as a friend
export function addFriend(userId) {
  return API.post('/users/friends', { userId });
}

// Get current user's friends
export function getFriends() {
  return API.get('/users/friends');
}

// Search for users by name or email
export function searchUsers(query) {
  return API.get(`/users/search?q=${encodeURIComponent(query)}`);
}