// client/src/api/rides.js
import { API } from './auth';

// Create a one-time ride offer
export function createRideOffer(rideData) {
  return API.post('/rides/offer', rideData);
}

// Create recurring rides
export function createRecurringRides(rideData) {
  return API.post('/rides/recurring', rideData);
}

// Search for ride matches
export function searchRides(params) {
  return API.get('/rides/search', { params });
}

// Get AI-based ride matches
export function getAiMatches(criteria) {
  return API.post('/rides/ai-match', criteria);
}

// Get all available rides (without search parameters)
export function getAllAvailableRides() {
  return API.get('/rides/available');
}

// Request to join a ride
export function requestToJoinRide(rideId) {
  const userId = sessionStorage.getItem('userId');
  return API.post('/rides/request', { rideId, userId });
}

// Confirm a rider's request
export function confirmRideRequest(rideId, userId) {
  return API.post('/rides/confirm', { rideId, userId });
}

// Deny a rider's request
export function denyRideRequest(rideId, userId) {
  return API.post('/rides/deny', { rideId, userId });
}

// Get ride details by ID
export function getRideById(rideId) {
  return API.get(`/rides/${rideId}`);
}

// Get rides created by the current user
export function getMyRides() {
  const userId = sessionStorage.getItem('userId');
  
  // If no userId in localStorage, use "me" as a special identifier
  // The backend will extract user ID from the token
  if (!userId) {
    return API.get(`/rides/owner/me`);
  }
  
  return API.get(`/rides/owner/${userId}`);
}

// Update a ride
export function updateRide(rideId, updates) {
  return API.put(`/rides/${rideId}`, updates);
}

// Delete a ride
export function deleteRide(rideId) {
  return API.delete(`/rides/${rideId}`);
}

// Submit a rating for a rider
export function rateRider(rideId, riderId, score, comment = '') {
  return API.post('/rides/rate', { rideId, riderId, score, comment });
}

// Submit feedback for a ride
export function submitFeedback(rideId, overallScore, comments = '') {
  return API.post('/feedback', { rideId, overallScore, comments });
}