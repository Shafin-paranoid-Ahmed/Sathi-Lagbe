// client/src/api/stats.js
import { API } from './auth.js';

// Get dashboard statistics
export function getDashboardStats() {
  return API.get('/stats/dashboard');
}
