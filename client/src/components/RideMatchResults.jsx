// client/src/components/RideMatchResults.jsx

import { useState, useEffect } from 'react';
import { searchRides, getAiMatches, requestToJoinRide, getAllAvailableRides } from '../api/rides';
import { API } from '../api/auth';
import MapView from './MapView';
import LocationAutocomplete from './LocationAutocomplete';
import CustomDateTimePicker from './CustomDateTimePicker';

export default function RideMatchResults() {

  
  const [searchParams, setSearchParams] = useState({
    startLocation: '',
    endLocation: '',
    departureTime: ''
  });

  const [matches, setMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState('');
  const [useAI, setUseAI] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [genderFilter, setGenderFilter] = useState('all');

  const [isSearching, setIsSearching] = useState(false);
  const [seatCounts, setSeatCounts] = useState({});
  const [visibleMap, setVisibleMap] = useState(null);
  const [feedbackOpenFor, setFeedbackOpenFor] = useState(null);
  const [feedbackData, setFeedbackData] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Feature flag for custom picker - set to false to revert to native picker
  const USE_CUSTOM_PICKER = true;

  // Load all available rides on component mount
  useEffect(() => {

    
    // Check authentication first
    const token = sessionStorage.getItem('token');
    const userId = sessionStorage.getItem('userId');
    

    
    if (!token || !userId) {
      setErrors({ api: 'Please log in to view available rides. Your session may have expired.' });
      setLoading(false);
      return;
    }
    
    loadAllRides();
  }, []);

  // Filter matches based on gender filter
  useEffect(() => {
    if (genderFilter === 'all') {
      setFilteredMatches(matches);
    } else {
      // Now we can trust that riderGender is the single source of truth.
      setFilteredMatches(matches.filter(ride => ride.riderGender === genderFilter));
    }
  }, [matches, genderFilter]);

  const loadAllRides = async () => {

    setLoading(true);
    setErrors({});
    setSuccess('');
    setIsSearching(false);
    
    // Check if user is authenticated
    const token = sessionStorage.getItem('token');
    const userId = sessionStorage.getItem('userId');
    
    if (!token || !userId) {
      setErrors({ api: 'Please log in to view available rides. Your session may have expired.' });
      setLoading(false);
      return;
    }
    
    try {
      const res = await getAllAvailableRides();
      
      setMatches(res.data || []);
      if (res.data && res.data.length === 0) {
        setSuccess('No rides available at the moment.');
      }
    } catch (err) {
      console.error('Error fetching rides:', err);
      
      // Handle authentication errors specifically
      if (err.response?.status === 401) {
        setErrors({ api: 'Your session has expired. Please log in again to view rides.' });
        // Clear invalid session data
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('userName');
      } else {
        setErrors({ api: err.response?.data?.error || 'Error fetching rides. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  // Set departure time to current time + 5 minutes (ASAP)
  const setAsapTime = () => {
    const now = new Date();
    const asapTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    setSearchParams(prev => ({ ...prev, departureTime: asapTime.toISOString() }));
    
    // Clear departure time error when user sets ASAP time
    if (errors.departureTime) {
      setErrors(prev => ({ ...prev, departureTime: undefined }));
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setHasSubmitted(true); // Mark that form has been submitted
    setErrors({});
    setSuccess('');
    setMatches([]);
    setLoading(true);
    setIsSearching(true);
    
    // Check if user is authenticated
    const token = sessionStorage.getItem('token');
    const userId = sessionStorage.getItem('userId');
    
    if (!token || !userId) {
      setErrors({ api: 'Please log in to search for rides. Your session may have expired.' });
      setLoading(false);
      setIsSearching(false);
      return;
    }
    
    try {
      let res;
      

      
      if (useAI) {
        res = await getAiMatches(searchParams);
      } else {
        res = await searchRides(searchParams);
      }
      
      setMatches(res.data);
      if (res.data.length === 0) {
        setSuccess('No rides found matching your criteria.');
      }
    } catch (err) {
      console.error('Error searching rides:', err);
      
      // Handle authentication errors specifically
      if (err.response?.status === 401) {
        setErrors({ api: 'Your session has expired. Please log in again to search rides.' });
        // Clear invalid session data
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('userId');
        sessionStorage.removeItem('userName');
      } else {
        setErrors({ api: err.response?.data?.error || 'Error searching rides. Please try again.' });
      }
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handleRequestToJoin = async (rideId) => {
    try {
      const seatCount = seatCounts[rideId] || 1;
      await requestToJoinRide(rideId, seatCount);
      setSuccess('Request sent successfully!');
      
      // Update the UI to show the request was sent
      setMatches(prev => 
        prev.map(ride => 
          ride._id === rideId 
            ? { ...ride, requested: true } 
            : ride
        )
      );
    } catch (err) {
      setErrors({ api: err.response?.data?.error || 'Failed to send request' });
    }
  };

  const openFeedback = async (rideId) => {
    try {
      setFeedbackOpenFor(rideId);
      setFeedbackLoading(true);
      setFeedbackData(null);
      const res = await API.get(`/feedback/ride/${rideId}/breakdown`);
      setFeedbackData(res.data);
    } catch (e) {
      console.error('Failed to load feedback', e);
      setFeedbackData({ error: e.response?.data?.error || 'Failed to load feedback' });
    } finally {
      setFeedbackLoading(false);
    }
  };

  const closeFeedback = () => {
    setFeedbackOpenFor(null);
    setFeedbackData(null);
  };


  


  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg space-y-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Find a Ride</h2>
      
      {success && (
        <div className="p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
          {success}
        </div>
      )}

      {!hasSubmitted && errors.api && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          {errors.api}
          {errors.api.includes('log in') && (
            <div className="mt-2">
              <a 
                href="/login" 
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </a>
            </div>
          )}
        </div>
      )}

      {hasSubmitted && errors.api && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          {errors.api}
          {errors.api.includes('log in') && (
            <div className="mt-2">
              <a 
                href="/login" 
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Go to Login
              </a>
            </div>
          )}
        </div>
      )}
      
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Location
            </label>
            <LocationAutocomplete
              value={searchParams.startLocation}
              onChange={(value) => setSearchParams({ ...searchParams, startLocation: value })}
              placeholder="e.g., Gulshan, Dhaka"
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Location (optional)
            </label>
            <LocationAutocomplete
              value={searchParams.endLocation}
              onChange={(value) => setSearchParams({ ...searchParams, endLocation: value })}
              placeholder="e.g., Banani, Dhaka"
              disabled={loading}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Departure Time (optional)
          </label>
          <div className="flex space-x-2">
            {USE_CUSTOM_PICKER ? (
              <div className="flex-1">
                <CustomDateTimePicker
                  value={searchParams.departureTime}
                  onChange={(value) => setSearchParams({ ...searchParams, departureTime: value })}
                  placeholder="Select departure time (optional)"
                  disabled={loading}
                />
              </div>
            ) : (
              <input
                type="datetime-local"
                value={searchParams.departureTime}
                onChange={e => setSearchParams({ ...searchParams, departureTime: e.target.value })}
                min={new Date().toISOString().slice(0, 16)} // Prevent past dates
                className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
              />
            )}
            <button
              type="button"
              onClick={setAsapTime}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 transition-colors font-medium"
            >
              🚀 ASAP
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={useAI}
                onChange={() => setUseAI(!useAI)}
                className="rounded"
              />
              <span>Use AI matching (finds better matches)</span>
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Gender Filter:
            </label>
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="p-2 border rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors disabled:opacity-50 font-medium"
          >
            {loading ? 'Searching...' : 'Search Rides'}
          </button>
          <button
            type="button"
            onClick={loadAllRides}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 font-medium"
          >
            Show All Rides
          </button>
        </div>
      </form>

      <div className="space-y-4 mt-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isSearching 
              ? (filteredMatches.length > 0 ? 'Search Results' : 'No rides found matching your criteria.')
              : (filteredMatches.length > 0 
                  ? 'Available Rides' 
                  : loading 
                    ? 'Loading rides...' 
                    : 'No rides available at the moment.')}
          </h3>
          {genderFilter !== 'all' && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredMatches.length} of {matches.length} rides
            </span>
          )}
        </div>
        
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading rides...</p>
          </div>
        )}
        
        {!loading && filteredMatches.map(ride => {
          // Add a failsafe check in case the backend sends a ride with a null riderId
          if (!ride.riderId) {
            return null; // Don't render this ride
          }
          return (
            <div 
              key={ride._id} 
              className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700"
            >
              {useAI && ride.matchScore !== undefined && (
                <div className="mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900 dark:to-indigo-900 text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-700">
                      🤖 AI Match: {ride.matchScore}%
                    </span>
                    {ride.matchScore >= 80 && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Excellent Match!</span>
                    )}
                    {ride.matchScore >= 60 && ride.matchScore < 80 && (
                      <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Good Match</span>
                    )}
                    {ride.matchScore < 60 && (
                      <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Fair Match</span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-3 mb-3 border-b border-gray-200 dark:border-gray-600 pb-2">
                {ride.riderId.avatarUrl ? (
                  <img src={ride.riderId.avatarUrl} alt={ride.riderId.name || 'Ride Owner'} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 font-bold">
                    {ride.riderId.name ? ride.riderId.name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {ride.riderId.name || 'Unknown User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Ride Owner
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                <div>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong className="text-gray-900 dark:text-gray-100">From:</strong> {ride.startLocation}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong className="text-gray-900 dark:text-gray-100">To:</strong> {ride.endLocation}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong className="text-gray-900 dark:text-gray-100">Seats:</strong> {ride.availableSeats ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong className="text-gray-900 dark:text-gray-100">Departure:</strong>{' '}
                    {new Date(ride.departureTime).toLocaleString()}
                  </p>
                  {ride.recurring && (
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong className="text-gray-900 dark:text-gray-100">Recurring:</strong>{' '}
                      {ride.recurring.days ? ride.recurring.days.join(', ') : 'Yes'}
                    </p>
                  )}
                </div>
              </div>
              
              {typeof ride.averageRating !== 'undefined' && ride.averageRating !== null && (
                <div className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                  <strong className="text-gray-900 dark:text-gray-100">Owner Rating:</strong> {ride.averageRating} ⭐ ({ride.totalRatings || 0})
                </div>
              )}
              
              <div className="flex items-center space-x-2 mt-2">
                <input
                  type="number"
                  min="1"
                  value={seatCounts[ride._id] || 1}
                  onChange={e => setSeatCounts({ ...seatCounts, [ride._id]: Number(e.target.value) })}
                  className="w-20 p-2 border rounded bg-white dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={() => handleRequestToJoin(ride._id)}
                  disabled={ride.requested || (ride.availableSeats !== undefined && ride.availableSeats <= 0)}
                  className="px-4 py-1 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 transition-colors"
                >
                  {ride.requested ? 'Request Sent' : (ride.availableSeats !== undefined && ride.availableSeats <= 0 ? 'Full' : 'Request to Join')}
                </button>
                <button
                  onClick={() => openFeedback(ride._id)}
                  className="px-4 py-1 bg-purple-600 dark:bg-purple-700 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-800 transition-colors"
                >
                  See Feedback
                </button>
                <button
                  onClick={() => setVisibleMap(visibleMap === ride._id ? null : ride._id)}
                  className="px-4 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  {visibleMap === ride._id ? 'Hide Route' : 'Show Route'}
                </button>
              </div>
              {visibleMap === ride._id && (
                <div className="mt-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                  <MapView startLocation={ride.startLocation} endLocation={ride.endLocation} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {feedbackOpenFor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ride Feedback</h3>
              <button onClick={closeFeedback} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            {feedbackLoading ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">Loading...</div>
            ) : feedbackData?.error ? (
              <div className="text-center py-6 text-red-600 dark:text-red-400">{feedbackData.error}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded p-3 border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Passengers about Owner</h4>
                  {(!feedbackData?.riderFeedback || feedbackData.riderFeedback.length === 0) ? (
                    <p className="text-sm text-gray-500">No feedback yet.</p>
                  ) : feedbackData.riderFeedback.map((f, i) => (
                    <div key={i} className="mb-2">
                      <p className="text-sm text-gray-800 dark:text-gray-200"><strong>{f.userId?.name || 'User'}:</strong> {f.overallScore}⭐</p>
                      {f.comments && <p className="text-xs text-gray-500">"{f.comments}"</p>}
                    </div>
                  ))}
                </div>
                <div className="border rounded p-3 border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Owner about Riders</h4>
                  {(!feedbackData?.ownerAboutRiders || feedbackData.ownerAboutRiders.length === 0) ? (
                    <p className="text-sm text-gray-500">No feedback yet.</p>
                  ) : feedbackData.ownerAboutRiders.map((o, i) => (
                    <div key={i} className="mb-2">
                      <p className="text-sm text-gray-800 dark:text-gray-200"><strong>{o.rider?.name || 'Rider'}:</strong> {o.score}⭐</p>
                      {o.comment && <p className="text-xs text-gray-500">"{o.comment}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}