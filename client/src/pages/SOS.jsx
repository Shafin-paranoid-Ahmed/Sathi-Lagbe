// client/src/pages/Sos.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import { getContacts, saveContacts, sendSosAlert } from '../api/sos';
import { API } from '../api/auth';
import socketService from '../services/socketService';
import { UserPlusIcon, PhoneIcon, TrashIcon, UserCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';


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
  const [isLiveSharing, setIsLiveSharing] = useState(false);
  const watchIdRef = useRef(null);

  // Get filtered contacts for display - show all valid contacts for the current user
  const displayContacts = useMemo(() => contacts.filter(c => 
    c && 
    c.name && 
    c.name.trim() !== '' && 
    (c.addedBy === currentUserId || !c.addedBy) // Show contacts added by current user OR contacts without addedBy (legacy)
  ), [contacts, currentUserId]);
  
  const displayContactsRef = useRef(displayContacts);
  displayContactsRef.current = displayContacts;

  // Load contacts on mount and when user changes
  useEffect(() => {
    const loadContacts = async () => {
      setLoading(true);
      try {
        const res = await getContacts();
        
        // Handle different API response structures
        let contactsData = [];
        if (res.data && res.data.data && res.data.data.contacts) {
          contactsData = res.data.data.contacts;
        } else if (res.data && Array.isArray(res.data)) {
          contactsData = res.data;
        } else {
          contactsData = [];
        }
        
        setContacts(contactsData);
      } catch {
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

  // Cleanup location watch on unmount - this is a safety net
  useEffect(() => {
    return () => {
      if (watchIdRef.current && navigator.geolocation && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

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

  // Live location sharing when enabled
  useEffect(() => {
    if (!isLiveSharing) {
      if (watchIdRef.current && navigator.geolocation && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    
    if (!navigator.geolocation) return;
    
    const startWatch = () => {
      try {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setCoordinates({ latitude, longitude });
            
            // Determine in-app recipients (contacts with userId)
            const recipientIds = displayContactsRef.current
              .filter(c => c.userId)
              .map(c => c.userId);
              
            if (recipientIds.length > 0) {
              socketService.emit('sos_location_update', {
                recipientIds,
                latitude,
                longitude,
                timestamp: new Date()
              });
            }
          },
          (err) => {
            setError('Live location sharing failed: ' + err.message);
            setIsLiveSharing(false);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
          }
        );
      } catch (e) {
        setError('Failed to start location sharing: ' + e.message);
        setIsLiveSharing(false);
      }
    };
    
    startWatch();
    
    // This cleanup runs when isLiveSharing becomes false
    return () => {
      if (watchIdRef.current && navigator.geolocation && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isLiveSharing]);

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
        saveContacts(newContacts)
          .catch(() => {
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
        saveContacts(newContacts)
          .catch(() => {
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
    setContacts(updated);
    
    // Save to backend
    saveContacts(updated)
      .catch(() => {
        setError('Failed to update contacts');
      });
    
    // Clear any previous errors
    setError('');
  };

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
      // Enable live sharing after initial SOS
      setIsLiveSharing(true);
    } catch (err) {
      setError('Failed to send SOS: ' + (err.message || ''));
    } finally {
      setAlerting(false);
    }
  };

  const stopLiveSharing = () => {
    
    // Clear the location watch
    if (watchIdRef.current && navigator.geolocation && navigator.geolocation.clearWatch) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    // Notify recipients that live sharing has stopped
    const recipientIds = displayContacts.filter(c => c.userId).map(c => c.userId);
    if (recipientIds.length > 0) {
      socketService.emit('sos_stop_sharing', { recipientIds });
    }
    
    setIsLiveSharing(false);
    setError(''); // Clear any location-related errors
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 animate-fade-in">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 space-y-6">
        <div className="text-center">
          <ShieldCheckIcon className="h-12 w-12 text-red-500 mx-auto mb-2" />
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            Emergency SOS
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage contacts and send alerts in case of an emergency.</p>
        </div>


        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-600 animate-fade-in">
            {error}
          </div>
        )}

        {/* Add new contact form */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
            Add Emergency Contact
          </h2>
          <div className="space-y-3">
            <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded-lg">
              <input type="checkbox" checked={isAppUser} onChange={e => setIsAppUser(e.target.checked)} className="rounded text-primary-500 focus:ring-primary-500" />
              <span>Add a friend who uses this app</span>
            </label>

            {isAppUser ? (
              <select
                value={selectedFriendId}
                onChange={e => setSelectedFriendId(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-gray-600 dark:text-white dark:border-gray-500 focus:ring-2 focus:ring-primary-500 transition"
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
                  className="w-full p-2 border rounded-lg dark:bg-gray-600 dark:text-white dark:border-gray-500 focus:ring-2 focus:ring-primary-500 transition"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={newContact.phone}
                  onChange={e => setNewContact({...newContact, phone: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-gray-600 dark:text-white dark:border-gray-500 focus:ring-2 focus:ring-primary-500 transition"
                />
              </>
            )}
            <button
              onClick={addContact}
              className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-transform transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <UserPlusIcon className="h-5 w-5" />
              <span>Add Contact</span>
            </button>
          </div>
        </div>

        {/* Contacts list */}
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
            Your Emergency Contacts
          </h2>

          {loading && <p className="text-gray-600 dark:text-gray-400">Loading...</p>}

          {!loading && displayContacts.length === 0 && (
            <div className="text-center py-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400">No contacts added yet.</p>
            </div>
          )}

          <ul className="space-y-2">
            {displayContacts.map((c, index) => (
              <li
                key={c.userId || c.phone || index}
                className="p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-sm flex justify-between items-center transition-transform transform hover:scale-105"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${c.userId ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-600'}`}>
                    {c.userId ? <UserCircleIcon className="h-6 w-6 text-green-500" /> : <PhoneIcon className="h-6 w-6 text-gray-500" />}
                  </div>
                  <div>
                    <span className="text-gray-800 dark:text-gray-200 font-medium">
                      {c.name || 'Unknown Contact'}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 block">
                      {c.phone || 'App User'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeContact(index)}
                  className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        {/* SOS section */}
        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-xl border-2 border-dashed border-red-300 dark:border-red-700">
          <h2 className="text-xl font-bold mb-3 text-red-800 dark:text-red-200 text-center">
            Emergency Alert
          </h2>
          
          <div className="space-y-3 mb-4">
            <input
              type="text"
              placeholder="Your Location (optional)"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-red-500 transition"
            />
            
            <textarea
              placeholder="Emergency Message (optional, e.g., 'I am in danger')"
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-2 focus:ring-red-500 transition"
              rows="2"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleAlert}
              disabled={alerting || displayContacts.length === 0}
              className={`w-full py-4 text-white text-lg font-bold rounded-lg transition-all transform hover:scale-105 flex items-center justify-center space-x-2 ${alerting || displayContacts.length === 0 ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 animate-pulse'}`}
            >
              <ShieldCheckIcon className="h-6 w-6" />
              <span>{alerting ? 'Sending Alert...' : 'SEND SOS'}</span>
            </button>
          </div>
          
          {coordinates.latitude && coordinates.longitude && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 text-center">
              Your current coordinates will be included in the alert.
            </p>
          )}
          
          {/* Live location status */}
          {isLiveSharing && (
            <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg animate-fade-in">
              <div className="flex justify-between items-center">
                <p className="text-xs text-green-700 dark:text-green-300 text-center">
                  🟢 Live location sharing active
                </p>
                <button
                  type="button"
                  onClick={stopLiveSharing}
                  className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Stop
                </button>
              </div>
              {coordinates.latitude && coordinates.longitude && (
                <p className="text-xs text-green-600 dark:text-green-400 text-center mt-1">
                  Current: {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}