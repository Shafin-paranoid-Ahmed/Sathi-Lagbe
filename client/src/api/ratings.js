// client/src/api/ratings.js
import { API } from './auth';

// Submit a new rating
export function submitRating(ratingData) {
  return API.post('/ratings', ratingData);
}

// Get all ratings for a specific user
export function getUserRatings(userId, page = 1, limit = 10, category = 'all') {
  const params = { page, limit };
  if (category !== 'all') {
    params.category = category;
  }
  return API.get(`/ratings/user/${userId}`, { params });
}

// Get average rating for a user
export function getAverageRating(userId) {
  return API.get(`/ratings/user/${userId}/average`);
}

// Get ratings given by the current user
export function getRatingsGiven(page = 1, limit = 10) {
  return API.get('/ratings/given', { params: { page, limit } });
}

// Update a rating
export function updateRating(ratingId, updates) {
  return API.put(`/ratings/${ratingId}`, updates);
}

// Delete a rating
export function deleteRating(ratingId) {
  return API.delete(`/ratings/${ratingId}`);
}

// Get rating statistics for a user
export function getRatingStatistics(userId) {
  return API.get(`/ratings/user/${userId}/statistics`);
}
