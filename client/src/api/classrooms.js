// client/src/api/classrooms.js
import { API } from './auth';

/**
 * Get all classrooms
 * @returns {Promise}
 */
export function getAllClassrooms() {
  return API.get('/classrooms/all');
}
