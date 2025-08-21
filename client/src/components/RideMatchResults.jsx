// client/src/components/RideMatchResults.jsx

import { useState, useEffect } from 'react';
import { searchRides, getAiMatches, requestToJoinRide, getAllAvailableRides } from '../api/rides';
import MapView from './MapView';
import LocationAutocomplete from './LocationAutocomplete';
import CustomDateTimePicker from './CustomDateTimePicker';

export default function RideMatchResults() {
  console.log('RideMatchResults component rendering...');
  
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

  // Feature flag for custom picker - set to false to revert to native picker
  const USE_CUSTOM_PICKER = true;

  // Load all available rides on component mount
  useEffect(() => {
    console.log('RideMatchResults useEffect triggered - loading all rides');
    loadAllRides();
  }, []);

  // Filter matches based on gender filter
  useEffect(() => {
    if (genderFilter === 'all') {
      setFilteredMatches(matches);
    } else {
      // Directly filter using the consistent riderGender field
      setFilteredMatches(matches.filter(ride => ride.riderGender === genderFilter));
    }
  }, [matches, genderFilter]);

  const loadAllRides = async () => {
    console.log('loadAllRides function called');
    setLoading(true);
    setErrors({});
    setSuccess('');
    setIsSearching(false);
    
    try {
      console.log('=== Frontend: Calling getAllAvailableRides ===');
      const res = await getAllAvailableRides();
      console.log('=== Frontend: API Response ===', res);
      console.log('=== Frontend: Response data ===', res.data);
      console.log('=== Frontend: Number of rides received ===', res.data?.length || 0);
      
      setMatches(res.data || []);
      if (res.data && res.data.length === 0) {
        setSuccess('No rides available at the moment.');
      }
    } catch (err) {
      console.error('=== Frontend: Error fetching rides ===', err);
      setErrors({ api: err.response?.data?.error || 'Error fetching rides' });
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
      setErrors({ api: err.response?.data?.error || 'Error fetching rides' });
    } finally {
      setLoading(false);
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

  const getGenderIcon = (gender) => {
    // Remove emoji function - no longer needed
    return '';
  };

  console.log('RideMatchResults render state:', { loading, matches: matches.length, errors, success });
  
  // Debug: Log the first ride to see what data we're getting
  if (matches.length > 0) {
    console.log('First ride data:', matches[0]);
    console.log('First ride riderId:', matches[0].riderId);
    console.log('First ride riderId type:', typeof matches[0].riderId);
    console.log('First ride riderId gender:', matches[0].riderId?.gender);
    console.log('First ride riderId gender type:', typeof matches[0].riderId?.gender);
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-800 shadow-md rounded-lg space-y-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Find a Ride</h2>
      
      {success && (
        <div className="p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
          {success}
        </div>
      )}

      {hasSubmitted && errors.api && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
          {errors.api}
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
        
        {!loading && filteredMatches.map(ride => (
          <div 
            key={ride._id} 
            className="border border-gray-200 dark:border-gray-600 p-4 rounded-lg shadow-sm bg-gray-50 dark:bg-gray-700"
          >
            {useAI && isSearching && (
              <div className="mb-2">
                <span className="inline-block bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded text-sm">
                  Match Score: {ride.matchScore}%
                </span>
              </div>
            )}
            
            {/* User Information */}
            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center space-x-2">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {ride.riderName || ride.riderId?.name || 'Anonymous User'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {(() => {
                      // Try to get gender from the direct field first, then fall back to populated field
                      const gender = ride.riderGender; // Directly use the consistent field
        
                      if (gender && typeof gender === 'string' && gender.trim() !== '') {
                        // Capitalize the first letter for display
                        return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
                      }
                      
                      return 'Gender not specified';
                    })()}
                  </p>
                </div>
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
                disabled={ride.requested}
                className="px-4 py-1 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 transition-colors"
              >
                {ride.requested ? 'Request Sent' : 'Request to Join'}
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
        ))}
      </div>
    </div>
  );
}