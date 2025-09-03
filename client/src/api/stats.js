// client/src/api/stats.js
import { API } from './auth';

// Get dashboard statistics
export function getDashboardStats() {
  return API.get('/stats/dashboard');
}
