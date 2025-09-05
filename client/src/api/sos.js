// client/src/api/sos.js
import { API } from './auth';

// Fetch the user's SOS contacts
export function getContacts() {
  return API.get('/sos/getcontacts');
}

// Save SOS contacts
export function saveContacts(contacts) {
  return API.post('/sos/savecontacts', { contacts });
}

// Trigger an SOS alert to all contacts
export function sendSosAlert(payload) {
  // payload could be: { latitude, longitude, message }
  return API.post('/sos/alert', payload);
}

// Activate SOS with location
export function activateSos(location) {
  return API.post('/sos/activate', { location });
}

// Get SOS history
export function getSosHistory() {
  return API.get('/sos');
}