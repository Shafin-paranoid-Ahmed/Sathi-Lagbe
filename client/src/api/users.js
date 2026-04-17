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

// Get user details by ID (including profile picture)
export function getUserById(userId) {
  return API.get(`/users/${userId}`);
}

// Get multiple users by IDs (for batch profile picture loading)
export function getUsersByIds(userIds) {
  return API.post('/users/batch', { userIds });
}

// Get bookmarked classrooms
export function getBookmarkedClassrooms() {
  return API.get('/users/bookmarks');
}

// Add a classroom to bookmarks
export function addClassroomBookmark(classroomId) {
  return API.post(`/users/bookmarks/${classroomId}`);
}

// Remove a classroom from bookmarks
export function removeClassroomBookmark(classroomId) {
  return API.delete(`/users/bookmarks/${classroomId}`);
}