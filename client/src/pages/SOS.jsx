// client/src/pages/Sos.jsx
import { useState, useEffect } from 'react';
import { getContacts, saveContacts, sendSosAlert } from '../api/sos';
import { API } from '../api/auth';

export default function Sos() {
  // Get current user ID for contact ownership validation
  const currentUserId = sessionStorage.getItem('userId');
  
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('');
  const [coordinates, setCoordinates] = useState({ latitude: null, longitude: null });
  const [isAppUser, setIsAppUser] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriendId, setSelectedFriendId] = useState('');

  // Load contacts on mount and when user changes
  useEffect(() => {
    const loadContacts = async () => {
      setLoading(true);
      try {
        const res = await getContacts();
        console.log('=== SOS CONTACTS DEBUG ===');
        console.log('API Response:', res);
        console.log('Current User ID:', currentUserId);
        
        // Handle different API response structures
        let contactsData = [];
        if (res.data && res.data.data && res.data.data.contacts) {
          contactsData = res.data.data.contacts;
        } else if (res.data && Array.isArray(res.data)) {
          contactsData = res.data;
        } else {
          contactsData = [];
        }
        
        console.log('Parsed contacts data:', contactsData);
        setContacts(contactsData);
      } catch (err) {
        console.error('Failed to load contacts:', err);
        setError('Failed to load contacts');
      } finally {
        setLoading(false);
      }
    };
    
    loadContacts();
    
    // Cleanup function to clear contacts when component unmounts or user changes
    return () => {
      setContacts([]);
      setError('');
      
      // Clear user-specific data on unmount
      const currentUserId = sessionStorage.getItem('userId');
      if (currentUserId) {
        localStorage.removeItem(`sosContacts_${currentUserId}`);
      }
    };
  }, [currentUserId]); // Reload when user changes

  // Get user's location on mount
  useEffect(() => {
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

  // Load accepted friends for dropdown when toggled
  useEffect(() => {
    const loadFriends = async () => {
      try {
        const res = await API.get('/friends/accepted');
        // Normalize to name + phone if available
        const list = (res.data || []).map(item => {
          const f = item.friend || item; // controller returns {friendshipId, friend}
          return {
            _id: f._id,
            name: f.name || f.email?.split('@')[0] || 'Unknown',
            phone: f.phone || ''
          };
        });
        setFriends(list);
      } catch (e) {
        console.error('Failed to load friends:', e);
        setFriends([]);
      }
    };
    if (isAppUser) loadFriends();
  }, [isAppUser]);

  // Add a new contact
  const addContact = () => {
    // Get current user ID from session storage
    const currentUserId = sessionStorage.getItem('userId');
    if (!currentUserId) {
      setError('User session not found. Please login again.');
      return;
    }

    if (isAppUser) {
      if (!selectedFriendId) {
        setError('Please select a friend');
        return;
      }
      const friend = friends.find(f => f._id === selectedFriendId);
      if (!friend) {
        setError('Invalid friend selected');
        return;
      }
      // Prevent duplicates (by userId)
      if (contacts.some(c => c.userId === friend._id)) {
        setError('This friend is already added as a contact');
        return;
      }
      const contactToAdd = { 
        name: friend.name || friend.email?.split('@')[0] || 'Unknown User', 
        phone: friend.phone || 'App User', 
        userId: friend._id,
        addedBy: currentUserId // Track who added this contact
      };
      setContacts(prev => {
        const newContacts = [...prev, contactToAdd];
        console.log('Saving contacts to backend:', newContacts);
        saveContacts(newContacts)
          .then(() => console.log('Contacts saved successfully'))
          .catch((err) => {
            console.error('Failed to save contact:', err);
            setError('Failed to save contact');
          });
        return newContacts;
      });
      setSelectedFriendId('');
      setIsAppUser(false);
      setError(''); // Clear any previous errors
      return;
    } else {
      if (!newContact.name || !newContact.phone) {
        setError('Name and phone are required');
        return;
      }
      // Prevent duplicates (by phone)
      if (contacts.some(c => c.phone === newContact.phone)) {
        setError('This phone number is already added');
        return;
      }
      // Validate contact data
      if (!newContact.name.trim() || !newContact.phone.trim()) {
        setError('Name and phone cannot be empty');
        return;
      }
      
      const contactToAdd = {
        ...newContact,
        addedBy: currentUserId // Track who added this contact
      };
      
      setContacts(prev => {
        const newContacts = [...prev, contactToAdd];
        console.log('Saving contacts to backend:', newContacts);
        saveContacts(newContacts)
          .then(() => console.log('Contacts saved successfully'))
          .catch((err) => {
            console.error('Failed to save contact:', err);
            setError('Failed to save contact');
          });
        return newContacts;
      });
      setNewContact({ name: '', phone: '' });
      setError(''); // Clear any previous errors
    }
  };

  // Remove a contact
  const removeContact = (index) => {
    const updated = contacts.filter((_, i) => i !== index);
    console.log('Removing contact, updated list:', updated);
    setContacts(updated);
    
    // Save to backend
    saveContacts(updated)
      .then(() => console.log('Contacts updated successfully after removal'))
      .catch((err) => {
        console.error('Failed to update contacts:', err);
        setError('Failed to update contacts');
      });
    
    // Clear any previous errors
    setError('');
  };
  
  // Get filtered contacts for display - show all valid contacts for the current user
  const displayContacts = contacts.filter(c => 
    c && 
    c.name && 
    c.name.trim() !== '' && 
    (c.addedBy === currentUserId || !c.addedBy) // Show contacts added by current user OR contacts without addedBy (legacy)
  );

  // Send an SOS alert
  const handleAlert = async () => {
    if (displayContacts.length === 0) {
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
            <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={isAppUser} onChange={e => setIsAppUser(e.target.checked)} />
              <span>They use this app</span>
            </label>

            {isAppUser ? (
              <select
                value={selectedFriendId}
                onChange={e => setSelectedFriendId(e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-600 dark:text-white"
              >
                <option value="">Select a friend</option>
                {friends.map((f, index) => (
                  <option key={f._id || `friend-${index}`} value={f._id}>{f.name}</option>
                ))}
              </select>
            ) : (
              <>
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
              </>
            )}
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

        {!loading && displayContacts.length === 0 && (
          <div>
            <p className="text-gray-600 dark:text-gray-400">No contacts added yet.</p>
            {/* Debug info */}
            <details className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <summary>Debug Info</summary>
              <p>Raw contacts: {JSON.stringify(contacts)}</p>
              <p>Display contacts: {JSON.stringify(displayContacts)}</p>
              <p>Current user ID: {currentUserId}</p>
            </details>
          </div>
        )}

        <ul className="mb-6 space-y-2">
          {displayContacts.map((c, index) => (
            <li
              key={c.userId || c.phone || index}
              className="p-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-sm flex justify-between items-center"
            >
              <div>
                <span className="text-gray-800 dark:text-gray-200 font-medium">
                  {c.name || 'Unknown Contact'}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                  {c.phone || 'App User'}
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
            disabled={alerting || displayContacts.length === 0}
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