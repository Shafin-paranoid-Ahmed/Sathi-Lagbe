// client/src/api/routine.js
import { API } from './auth';

// Get user's routine
export function getUserRoutine() {
  return API.get('/routine');
}

// Add new routine entry
export function addRoutineEntry(entryData) {
  return API.post('/routine', entryData);
}

// Update routine entry
export function updateRoutineEntry(entryId, entryData) {
  return API.put(`/routine/${entryId}`, entryData);
}

// Delete routine entry
export function deleteRoutineEntry(entryId) {
  return API.delete(`/routine/${entryId}`);
}

// Delete all routine entries for user
export function deleteAllUserRoutine() {
  return API.delete('/routine');
}
