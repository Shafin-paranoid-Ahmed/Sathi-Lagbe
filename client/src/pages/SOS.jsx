// client/src/pages/Sos.jsx
import { useState, useEffect } from 'react';
import { getContacts, saveContacts, sendSosAlert } from '../api/sos';

export default function Sos() {
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });

  // Load contacts on mount
  useEffect(() => {
    setLoading(true);
    getContacts()
      .then(res => {
        // Handle different API response structures
        if (res.data.data) {
          setContacts(res.data.data.contacts || []);
        } else {
          setContacts(res.data || []);
        }
      })
      .catch(() => setError('Failed to load contacts'))
      .finally(() => setLoading(false));
      
    // Try to get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => {
          setError('Location access denied. Please enable location services for emergency situations.');
        }
      );
    }
  }, []);

  // Add a new contact
  const addContact = () => {
    if (!newContact.name || !newContact.phone) {
      setError('Name and phone are required');
      return;
    }
    
    setContacts(prev => [...prev, newContact]);
    setNewContact({ name: '', phone: '' });
    
    // Save to backend
    saveContacts([...contacts, newContact])
      .catch(() => setError('Failed to save contact'));
  };

  // Remove a contact
  const removeContact = (index) => {
    const updated = contacts.filter((_, i) => i !== index);
    setContacts(updated);
    
    // Save to backend
    saveContacts(updated)
      .catch(() => setError('Failed to update contacts'));
  };

  // Send an SOS alert
  const handleAlert = async () => {
    if (contacts.length === 0) {
      setError('Please add at least one emergency contact first');
      return;
    }
    
    setAlerting(true);
    setError('');
    
    try {
      // Use coordinates if available, otherwise use the manually entered location
      const payload = {
        message: message || 'Help needed!',
        location: location || 'Unknown location'
      };
      
      if (coordinates.latitude && coordinates.longitude) {
        payload.latitude = coordinates.latitude;
        payload.longitude = coordinates.longitude;
      }
      
      await sendSosAlert(payload);
      alert('SOS alert sent!');
      setMessage('');
    } catch (err) {
      setError('Failed to send SOS: ' + (err.message || ''));
    } finally {
      setAlerting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-100">
          SOS Emergency Contacts
        </h1>

        {error && (
          <div className="mb-4 p-2 bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-100 rounded">
            {error}
          </div>
        )}

        {/* Add new contact form */}
        <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded">
          <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
            Add Emergency Contact
          </h2>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Contact Name"
              value={newContact.name}
              onChange={e => setNewContact({...newContact, name: e.target.value})}
              className="w-full p-2 border rounded dark:bg-gray-600 dark:text-white"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              value={newContact.phone}
              onChange={e => setNewContact({...newContact, phone: e.target.value})}
              className="w-full p-2 border rounded dark:bg-gray-600 dark:text-white"
            />
            <button
              onClick={addContact}
              className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Add Contact
            </button>
          </div>
        </div>

        {/* Contacts list */}
        <h2 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">
          Your Emergency Contacts
        </h2>

        {loading && <p className="text-gray-600 dark:text-gray-400">Loading...</p>}

        {!loading && contacts.length === 0 && (
          <p className="text-gray-600 dark:text-gray-400">No contacts added yet.</p>
        )}

        <ul className="mb-6 space-y-2">
          {contacts.map((c, index) => (
            <li
              key={index}
              className="p-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-sm flex justify-between items-center"
            >
              <div>
                <span className="text-gray-800 dark:text-gray-200 font-medium">{c.name}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  {c.phone}
                </span>
              </div>
              <button
                onClick={() => removeContact(index)}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>

        {/* SOS section */}
        <div className="bg-red-100 dark:bg-red-900 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-red-800 dark:text-red-100">
            Emergency SOS
          </h2>
          
          <div className="space-y-3 mb-4">
            <input
              type="text"
              placeholder="Your Location (optional)"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            />
            
            <textarea
              placeholder="Emergency Message (optional)"
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
              rows="2"
            />
          </div>
          
          <button
            onClick={handleAlert}
            disabled={alerting || contacts.length === 0}
            className="w-full py-3 bg-red-600 text-white text-lg font-bold rounded hover:bg-red-700 disabled:opacity-50"
          >
            {alerting ? 'Sending SOS Alert...' : 'SEND SOS ALERT'}
          </button>
          
          {coordinates.latitude && coordinates.longitude && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
              Your current coordinates will be included in the alert.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}